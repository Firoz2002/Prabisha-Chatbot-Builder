// lib/langchain/search-chain.ts
import { searchSimilar } from '@/lib/langchain/vector-store';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { generateText } from 'ai';
import prisma from '@/lib/prisma';

export interface SearchChainConfig {
  chatbotId: string;
  conversationId?: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SearchChainResult {
  response: string;
  htmlResponse: string;
  knowledgeContext?: string;
  logicContext?: string;
  triggeredLogics?: any[];
  conversationId: string;
  sourcesUsed?: number;
  sourceUrls?: Array<{ title: string; url: string }>;
}

const togetherai = createTogetherAI({
  apiKey: process.env.TOGETHER_AI_API_KEY ?? '',
});

// Enhanced query rewriting with multi-angle approach
const QUERY_REWRITE_PROMPT = `Generate 2-3 search variations for this question to capture different angles.
Keep each variation focused and 5-15 words.

User question: {question}

Output format (one per line):
1. [variation]
2. [variation]
3. [variation]`;

// Improved RAG prompt with HTML formatting instructions
const RAG_ANSWER_PROMPT = `You are a knowledgeable assistant. Use the CONTEXT below to answer the user's question.

IMPORTANT RULES:
1. Synthesize information from ALL relevant context chunks
2. If context has PARTIAL information, provide what you know and acknowledge gaps
3. Be specific - mention features, services, pricing, timelines when available
4. Connect related information across different context sources
5. Only say "I don't have information" if context is completely irrelevant
6. Use a helpful, conversational tone - not overly cautious

FORMATTING INSTRUCTIONS:
- Use HTML formatting for better readability
- Use <strong> for important points
- Use <ul> and <li> for lists
- Use <p> for paragraphs
- Use <br> for line breaks when needed
- DO NOT mention sources or URLs in your response (they will be added automatically)

CONTEXT (from knowledge base):
{context}

CONVERSATION HISTORY:
{history}

USER QUESTION: {question}

Provide a clear, helpful answer in HTML format:`;

// Fallback prompt when no knowledge base context found
const GENERAL_ANSWER_PROMPT = `{systemPrompt}

You're having a conversation with a user. They may ask about services, features, or general questions.

FORMATTING INSTRUCTIONS:
- Use HTML formatting for better readability
- Use <strong> for emphasis
- Use <ul> and <li> for lists
- Use <p> for paragraphs

CONVERSATION HISTORY:
{history}

{logicContext}

USER: {question}

ASSISTANT (be helpful and conversational, respond in HTML):`;

export async function rewriteQuery(userMessage: string): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: togetherai('meta-llama/Llama-3.3-70B-Instruct-Turbo'),
      prompt: QUERY_REWRITE_PROMPT.replace('{question}', userMessage),
      maxOutputTokens: 150,
      temperature: 0.4,
    });
    
    const variations = text
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(v => v.length > 0);
    
    // Always include original query
    const queries = [userMessage, ...variations].slice(0, 3);
    console.log('🔄 Query variations:', queries);
    return queries;
  } catch (error) {
    console.error('Query rewrite error:', error);
    return [userMessage];
  }
}

// Enhanced search with multiple queries and lower threshold
export async function searchKnowledgeBases(
  chatbot: any, 
  queries: string[]
): Promise<{ context: string; sources: Array<{ title: string; url: string; score: number }> }> {
  if (!chatbot.knowledgeBases?.length) return { context: '', sources: [] };

  const allResults: any[] = [];
  const seenContent = new Set<string>();
  const sourceUrls = new Map<string, { title: string; url: string; score: number }>();
  
  // Search with each query variation
  for (const query of queries) {
    for (const kb of chatbot.knowledgeBases) {
      try {
        const results = await searchSimilar({
          query,
          chatbotId: chatbot.id,
          knowledgeBaseId: kb.id,
          limit: 8,
          threshold: 0.55,
        });
        
        // Deduplicate by content hash and collect URLs
        for (const result of results) {
          const contentHash = result.content.substring(0, 100);
          if (!seenContent.has(contentHash)) {
            seenContent.add(contentHash);
            allResults.push({ 
              ...result, 
              kbName: kb.name,
              query: query
            });
            
            // Collect source URLs from metadata
            if (result.metadata?.url) {
              const url = result.metadata.url;
              const existingSource = sourceUrls.get(url);
              if (!existingSource || result.score > existingSource.score) {
                sourceUrls.set(url, {
                  title: result.metadata.title || kb.name,
                  url: url,
                  score: result.score
                });
              }
            }
          }
        }
        
        console.log(`📊 ${kb.name} (query: "${query}"): ${results.length} results`);
      } catch (error) {
        console.error(`❌ ${kb.name}:`, error);
      }
    }
  }

  if (!allResults.length) return { context: '', sources: [] };

  // Sort by score
  allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Take top results with diversity
  const top = selectDiverseResults(allResults, 10);
  
  console.log(`✅ Selected ${top.length} diverse results for context`);

  // Format with more structure
  const formatted = top.map((r, i) => {
    const scorePercent = (r.score * 100).toFixed(1);
    const source = r.metadata?.title || r.kbName || 'Knowledge Base';
    return `[Chunk ${i + 1} | Relevance: ${scorePercent}% | Source: ${source}]\n${r.content}`;
  }).join('\n\n---\n\n');

  const context = `KNOWLEDGE BASE CONTEXT:\n\n${formatted}\n\n(Total sources: ${top.length})`;
  
  // Get top 3 unique source URLs sorted by score
  const sources = Array.from(sourceUrls.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { context, sources };
}

// Select diverse results to avoid redundancy
function selectDiverseResults(results: any[], limit: number): any[] {
  const selected: any[] = [];
  const keywords = new Set<string>();
  
  for (const result of results) {
    if (selected.length >= limit) break;
    
    // Extract key terms from content
    const terms = result.content
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 4);
    
    // Calculate novelty (how many new terms this adds)
    const newTerms = terms.filter((t: string) => !keywords.has(t));
    const novelty = newTerms.length / Math.max(terms.length, 1);
    
    // Include if high score OR adds novelty
    if (result.score > 0.7 || novelty > 0.3 || selected.length < 3) {
      selected.push(result);
      newTerms.forEach((t: string) => keywords.add(t));
    }
  }
  
  return selected;
}

export function formatHistory(messages: any[]): string {
  if (!messages.length) return "This is the start of the conversation.";
  
  const recent = messages.slice(-6);
  return recent.map(m => 
    `${m.senderType === 'USER' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');
}

export async function getLogicContext(chatbot: any, message: string): Promise<string> {
  let ctx = '';
  for (const logic of chatbot.logics || []) {
    if (logic.triggerType === 'KEYWORD' && logic.keywords) {
      try {
        const keywords = JSON.parse(logic.keywords);
        if (keywords.some((k: string) => message.toLowerCase().includes(k.toLowerCase()))) {
          if (logic.type === 'LINK_BUTTON' && logic.linkButton) {
            ctx += `\nAVAILABLE ACTION: You can offer the user: "${logic.linkButton.buttonText}"\n`;
          } else if (logic.type === 'SCHEDULE_MEETING') {
            ctx += '\nAVAILABLE ACTION: You can offer to schedule a meeting with the user.\n';
          }
        }
      } catch (e) {}
    }
  }
  return ctx;
}

function generateSystemPrompt(chatbot: any): string {
  const base = chatbot.directive || "You are a helpful, knowledgeable assistant.";
  const personality = chatbot.description ? `\n\nYour personality: ${chatbot.description}` : "";
  const guidelines = `\n\nGuidelines:
- Be conversational and helpful
- Provide specific details when available
- If you're unsure, say so clearly
- Stay professional but friendly
- Format responses in HTML for better readability`;
  
  return `${base}${personality}${guidelines}`;
}

export async function checkLogicTriggers(chatbot: any, message: string) {
  const triggered: any[] = [];
  
  for (const logic of chatbot.logics || []) {
    if (logic.triggerType === 'KEYWORD' && logic.keywords) {
      try {
        const keywords = JSON.parse(logic.keywords);
        if (keywords.some((k: string) => message.toLowerCase().includes(k.toLowerCase()))) {
          triggered.push(logic);
        }
      } catch (e) {}
    }
  }
  
  return triggered;
}

// Convert plain text to HTML if needed
function ensureHtmlFormat(text: string): string {
  // If already has HTML tags, return as is
  if (/<[^>]+>/.test(text)) {
    return text;
  }
  
  // Convert plain text to basic HTML
  const paragraphs = text.split('\n\n');
  return paragraphs
    .map(p => {
      // Check if it's a list
      if (p.includes('\n- ') || p.includes('\n• ')) {
        const items = p.split('\n').filter(line => line.trim());
        const listItems = items
          .filter(item => item.startsWith('- ') || item.startsWith('• '))
          .map(item => `<li>${item.substring(2).trim()}</li>`)
          .join('');
        return `<ul>${listItems}</ul>`;
      }
      return `<p>${p.trim()}</p>`;
    })
    .join('');
}

// Add "Read More" section with source URLs
function appendReadMoreSection(
  htmlResponse: string, 
  sources: Array<{ title: string; url: string }>
): string {
  if (!sources.length) return htmlResponse;
  
  const readMoreSection = `
<div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
  <p style="font-weight: 600; color: #374151; margin-bottom: 10px;">📚 Read More:</p>
  <ul style="list-style: none; padding: 0; margin: 0;">
    ${sources.map(source => `
      <li style="margin-bottom: 8px;">
        <a href="${source.url}" 
           target="_blank" 
           rel="noopener noreferrer"
           style="color: #2563eb; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: color 0.2s;">
          <span style="font-size: 14px;">🔗</span>
          <span style="font-size: 14px; border-bottom: 1px solid transparent; transition: border-color 0.2s;">${source.title}</span>
          <span style="font-size: 12px; color: #9ca3af;">↗</span>
        </a>
      </li>
    `).join('')}
  </ul>
</div>`;

  return htmlResponse + readMoreSection;
}

export async function generateRAGResponse(
  chatbot: any, 
  userMessage: string, 
  conversationId: string
): Promise<{ 
  response: string;
  htmlResponse: string;
  knowledgeContext?: string; 
  logicContext?: string;
  sourcesUsed?: number;
  sourceUrls?: Array<{ title: string; url: string }>;
}> {
  try {
    // Get conversation history
    const history = await prisma.message.findMany({
      where: { 
        conversationId, 
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }
      },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    const formattedHistory = formatHistory(history);
    
    // Generate multiple query variations
    const queries = await rewriteQuery(userMessage);
    
    // Search with all variations and get sources
    const { context: knowledgeContext, sources } = await searchKnowledgeBases(chatbot, queries);
    const logicContext = await getLogicContext(chatbot, userMessage);

    let prompt: string;
    let mode: string;
    
    if (knowledgeContext) {
      // RAG mode with knowledge base
      prompt = RAG_ANSWER_PROMPT
        .replace('{context}', knowledgeContext)
        .replace('{history}', formattedHistory)
        .replace('{question}', userMessage);
      mode = 'RAG with knowledge base';
    } else {
      // Fallback to general conversation
      prompt = GENERAL_ANSWER_PROMPT
        .replace('{systemPrompt}', generateSystemPrompt(chatbot))
        .replace('{history}', formattedHistory)
        .replace('{logicContext}', logicContext)
        .replace('{question}', userMessage);
      mode = 'General conversation (no relevant knowledge found)';
    }

    console.log(`✅ Mode: ${mode}`);

    const { text } = await generateText({
      model: togetherai(chatbot.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'),
      prompt,
      maxOutputTokens: chatbot.max_tokens || 600,
      temperature: chatbot.temperature || 0.7,
    });

    const response = text.trim();
    
    // Ensure HTML formatting
    let htmlResponse = ensureHtmlFormat(response);
    
    // Add "Read More" section with source URLs
    if (sources.length > 0) {
      htmlResponse = appendReadMoreSection(htmlResponse, sources);
    }
    
    console.log('🤖 Response length:', response.length, 'chars');
    console.log('🔗 Source URLs:', sources.length);

    // Count sources used (approximate)
    const sourcesUsed = knowledgeContext 
      ? (knowledgeContext.match(/\[Chunk \d+/g) || []).length 
      : 0;

    return {
      response,
      htmlResponse,
      knowledgeContext: knowledgeContext || undefined,
      logicContext: logicContext || undefined,
      sourcesUsed,
      sourceUrls: sources.length > 0 ? sources : undefined
    };

  } catch (error) {
    console.error('RAG error:', error);
    throw error;
  }
}

export async function executeSearchChain(config: SearchChainConfig): Promise<SearchChainResult> {
  const {
    chatbotId,
    conversationId,
    userMessage,
  } = config;

  // Fetch chatbot with relations
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: {
      knowledgeBases: { include: { documents: true }},
      logics: {
        where: { isActive: true },
        include: {
          linkButton: true,
          meetingSchedule: true,
          leadCollection: { include: { formFields: true }}
        }
      }
    }
  });

  if (!chatbot) {
    throw new Error('Chatbot not found');
  }

  // Handle conversation (create or retrieve)
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId }});
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { chatbotId, title: userMessage.substring(0, 50) }
      });
    }
  } else {
    conversation = await prisma.conversation.create({
      data: { chatbotId, title: userMessage.substring(0, 50) }
    });
  }

  // Store user message
  await prisma.message.create({
    data: { content: userMessage, senderType: 'USER', conversationId: conversation.id }
  });

  // Check for logic triggers
  const triggeredLogics = await checkLogicTriggers(chatbot, userMessage);

  // Generate AI response with RAG
  const { 
    response, 
    htmlResponse, 
    knowledgeContext, 
    logicContext, 
    sourcesUsed,
    sourceUrls 
  } = await generateRAGResponse(
    chatbot,
    userMessage,
    conversation.id
  );

  // Store bot response (store HTML version)
  await prisma.message.create({
    data: { 
      content: htmlResponse, 
      senderType: 'BOT', 
      conversationId: conversation.id 
    }
  });

  return {
    response: htmlResponse, // Return HTML response
    htmlResponse,
    knowledgeContext,
    logicContext,
    triggeredLogics,
    conversationId: conversation.id,
    sourcesUsed,
    sourceUrls
  };
}

// Enhanced simple search with query variations
export async function simpleSearch(
  chatbotId: string,
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    includeKnowledgeBaseNames?: boolean;
  }
): Promise<Array<{
  content: string;
  score: number;
  metadata?: any;
  kbName?: string;
}>> {
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: { knowledgeBases: true }
  });

  if (!chatbot) {
    throw new Error('Chatbot not found');
  }

  const allResults: any[] = [];
  const seenContent = new Set<string>();
  
  for (const kb of chatbot.knowledgeBases || []) {
    try {
      const results = await searchSimilar({
        query,
        chatbotId: chatbot.id,
        knowledgeBaseId: kb.id,
        limit: options?.limit || 8,
        threshold: options?.threshold || 0.55,
      });
      
      for (const result of results) {
        const contentHash = result.content.substring(0, 100);
        if (!seenContent.has(contentHash)) {
          seenContent.add(contentHash);
          if (options?.includeKnowledgeBaseNames) {
            allResults.push({ ...result, kbName: kb.name });
          } else {
            allResults.push(result);
          }
        }
      }
    } catch (error) {
      console.error(`Knowledge base ${kb.name} search error:`, error);
    }
  }

  // Sort by score
  allResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  return allResults.slice(0, options?.limit || 10);
}