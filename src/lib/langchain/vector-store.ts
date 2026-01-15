// lib/langchain/vector-store.ts
import { MongoClient } from 'mongodb';
import { TogetherAIEmbeddings } from "@langchain/community/embeddings/togetherai";

const mongoClient = new MongoClient(process.env.MONGODB_URI!);
let isConnected = false;

async function connectMongo() {
  if (!isConnected) {
    await mongoClient.connect();
    isConnected = true;
  }
  return mongoClient;
}

interface EmbedAndStoreParams {
  documentId: string;
  content: string;
  metadata: Record<string, any>;
  chatbotId: string;
  knowledgeBaseId: string;
}

export async function embedAndStore({
  documentId,
  content,
  metadata,
  chatbotId,
  knowledgeBaseId,
}: EmbedAndStoreParams) {
  try {
    // Split content into chunks
    const chunks = chunkText(content, 1000);
    
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    // Create vector search index if it doesn't exist
    await ensureVectorIndex(collection);
    
    // Generate embeddings for all chunks
    const embeddings = await Promise.all(
      chunks.map(chunk => generateEmbedding(chunk))
    );
    
    // Prepare documents with chatbotId and knowledgeBaseId
    const documents = chunks.map((chunk, idx) => ({
      documentId,
      knowledgeBaseId,
      chatbotId,
      chunkIndex: idx,
      content: chunk,
      embedding: embeddings[idx],
      metadata: {
        ...metadata,
        chatbotId,
        knowledgeBaseId,
        documentId,
      },
      createdAt: new Date(),
    }));

    console.log(`Storing ${documents.length} chunks in MongoDB...`);
    
    // Insert documents
    const result = await collection.insertMany(documents);
    
    return {
      documentId,
      chunksStored: chunks.length,
      insertedIds: result.insertedIds,
    };
  } catch (error) {
    console.error('Error storing data:', error);
    throw new Error('Failed to store data');
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddings = new TogetherAIEmbeddings({
      apiKey: process.env.TOGETHER_API_KEY!,
      model: "togethercomputer/m2-bert-80M-32k-retrieval",
      maxRetries: 3,
      timeout: 30000,
    });

    const embedding = await embeddings.embedQuery(text);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

interface SearchParams {
  query: string;
  chatbotId: string;
  knowledgeBaseId?: string;
  limit?: number;
  filters?: Record<string, any>;
  threshold?: number;
}

export async function searchSimilar({
  query,
  chatbotId,
  knowledgeBaseId,
  limit = 5,
  filters = {},
  threshold = 0.7,
}: SearchParams) {
  try {
    console.log('Searching with params:', { query, chatbotId, knowledgeBaseId, limit, filters });
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    // Build the pipeline
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'knowledge_vectors_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit: limit * 3, // Get more initially for filtering
          filter: {
            chatbotId: chatbotId,
            ...(knowledgeBaseId && { knowledgeBaseId: knowledgeBaseId }),
            ...filters,
          },
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          knowledgeBaseId: 1,
          chatbotId: 1,
          chunkIndex: 1,
          content: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          score: { $gte: threshold },
        },
      },
      {
        $limit: limit,
      },
    ];
    
    console.log('Running pipeline:', JSON.stringify(pipeline, null, 2));
    
    const results = await collection.aggregate(pipeline).toArray();
    
    console.log(`Found ${results.length} results`);
    
    return results.map(result => ({
      documentId: result.documentId,
      knowledgeBaseId: result.knowledgeBaseId,
      chatbotId: result.chatbotId,
      chunkIndex: result.chunkIndex,
      content: result.content,
      metadata: result.metadata,
      score: result.score,
    }));
  } catch (error) {
    console.error('Error in searchSimilar:', error);
    // Fallback to text search if vector search fails
    return fallbackTextSearch({
      query,
      chatbotId,
      knowledgeBaseId,
      limit,
      filters,
    });
  }
}

async function fallbackTextSearch({
  query,
  chatbotId,
  knowledgeBaseId,
  limit = 5,
  filters = {},
}: Omit<SearchParams, 'threshold'>) {
  try {
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    const searchFilter: any = {
      chatbotId: chatbotId,
      ...(knowledgeBaseId && { knowledgeBaseId: knowledgeBaseId }),
      ...filters,
    };
    
    // Simple text search as fallback
    const results = await collection
      .find(searchFilter)
      .limit(limit)
      .toArray();
    
    return results.map(result => ({
      documentId: result.documentId,
      knowledgeBaseId: result.knowledgeBaseId,
      chatbotId: result.chatbotId,
      chunkIndex: result.chunkIndex,
      content: result.content,
      metadata: result.metadata,
      score: 0.8, // Default score for fallback
    }));
  } catch (error) {
    console.error('Error in fallbackTextSearch:', error);
    return [];
  }
}

async function ensureVectorIndex(collection: any) {
  try {
    const indexes = await collection.listSearchIndexes().toArray();
    const hasVectorIndex = indexes.some((idx: any) => idx.name === 'knowledge_vectors_index');
    
    if (!hasVectorIndex) {
      console.log('Creating vector search index...');
      
      await collection.createSearchIndex({
        name: 'knowledge_vectors_index',
        type: 'vectorSearch',
        definition: {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: 768, // m2-bert-80M dimension
              similarity: 'cosine',
            },
            {
              type: 'filter',
              path: 'chatbotId',
            },
            {
              type: 'filter',
              path: 'knowledgeBaseId',
            },
            {
              type: 'filter',
              path: 'metadata',
            },
          ],
        },
      });
      
      console.log('Vector search index created successfully');
    } else {
      console.log('Vector search index already exists');
    }
  } catch (error) {
    console.error('Error creating vector index:', error);
    throw error;
  }
}

function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  // Split by sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed max chunk size and we already have content
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  // Add the last chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If no chunks were created (e.g., text is empty), return empty array
  return chunks.length > 0 ? chunks : [];
}

// Delete all documents for a specific chatbot
export async function deleteChatbotKnowledge(chatbotId: string) {
  try {
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    const result = await collection.deleteMany({ chatbotId });
    
    console.log(`Deleted ${result.deletedCount} documents for chatbot ${chatbotId}`);
    
    return {
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('Error deleting chatbot knowledge:', error);
    throw new Error('Failed to delete chatbot knowledge');
  }
}

// Delete documents for a specific knowledge base
export async function deleteKnowledgeBase(knowledgeBaseId: string) {
  try {
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    const result = await collection.deleteMany({ knowledgeBaseId });
    
    console.log(`Deleted ${result.deletedCount} documents for knowledge base ${knowledgeBaseId}`);
    
    return {
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    throw new Error('Failed to delete knowledge base');
  }
}

// Delete a specific document
export async function deleteDocument(documentId: string) {
  try {
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    const result = await collection.deleteMany({ documentId });
    
    console.log(`Deleted ${result.deletedCount} chunks for document ${documentId}`);
    
    return {
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error('Failed to delete document');
  }
}

// Get statistics about stored knowledge
export async function getKnowledgeStats(chatbotId: string) {
  try {
    const client = await connectMongo();
    const db = client.db('prabisha_chatbots');
    const collection = db.collection('knowledge_bases');
    
    const stats = await collection.aggregate([
      {
        $match: { chatbotId }
      },
      {
        $group: {
          _id: '$knowledgeBaseId',
          totalChunks: { $sum: 1 },
          uniqueDocuments: { $addToSet: '$documentId' }
        }
      },
      {
        $project: {
          knowledgeBaseId: '$_id',
          totalChunks: 1,
          uniqueDocumentsCount: { $size: '$uniqueDocuments' }
        }
      }
    ]).toArray();
    
    const totalStats = await collection.aggregate([
      {
        $match: { chatbotId }
      },
      {
        $group: {
          _id: null,
          totalChunks: { $sum: 1 },
          uniqueDocuments: { $addToSet: '$documentId' },
          uniqueKnowledgeBases: { $addToSet: '$knowledgeBaseId' }
        }
      },
      {
        $project: {
          totalChunks: 1,
          totalDocuments: { $size: '$uniqueDocuments' },
          totalKnowledgeBases: { $size: '$uniqueKnowledgeBases' }
        }
      }
    ]).toArray();
    
    return {
      byKnowledgeBase: stats,
      total: totalStats[0] || {
        totalChunks: 0,
        totalDocuments: 0,
        totalKnowledgeBases: 0
      }
    };
  } catch (error) {
    console.error('Error getting knowledge stats:', error);
    return {
      byKnowledgeBase: [],
      total: {
        totalChunks: 0,
        totalDocuments: 0,
        totalKnowledgeBases: 0
      }
    };
  }
}

// Test the vector search connection and index
export async function testVectorSearchConnection() {
  try {
    const client = await connectMongo();
    const db = client.db('chatbot_vectors');
    const collection = db.collection('knowledge_vectors');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'knowledge_vectors' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('knowledge_vectors');
      console.log('Created knowledge_vectors collection');
    }
    
    // Ensure index exists
    await ensureVectorIndex(collection);
    
    // Try a simple query to test
    const testDoc = await collection.findOne({});
    
    return {
      connected: true,
      collectionExists: true,
      indexCreated: true,
      hasData: !!testDoc,
      message: 'Vector search connection successful'
    };
  } catch (error) {
    console.error('Vector search connection test failed:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Vector search connection test failed'
    };
  }
}
