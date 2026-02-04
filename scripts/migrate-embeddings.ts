// scripts/migrate-to-gemini.ts
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TogetherAIEmbeddings } from "@langchain/community/embeddings/togetherai";
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,
  DELAY_BETWEEN_BATCHES: 2000, // 2 seconds
  MAX_RETRIES: 3,
  LOG_DIR: join(process.cwd(), 'logs'),
  BACKUP_DIR: join(process.cwd(), 'backups'),
};

// Setup logging
function setupLogging() {
  if (!existsSync(CONFIG.LOG_DIR)) {
    mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }
  if (!existsSync(CONFIG.BACKUP_DIR)) {
    mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
  }
  
  const logStream = createWriteStream(
    join(CONFIG.LOG_DIR, `migration-${Date.now()}.log`),
    { flags: 'a' }
  );
  
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args) => {
    const message = `[${new Date().toISOString()}] LOG: ${args.join(' ')}\n`;
    logStream.write(message);
    originalLog(...args);
  };
  
  console.error = (...args) => {
    const message = `[${new Date().toISOString()}] ERROR: ${args.join(' ')}\n`;
    logStream.write(message);
    originalError(...args);
  };
  
  return () => {
    logStream.end();
    console.log = originalLog;
    console.error = originalError;
  };
}

// Embedding clients
let geminiEmbeddings: GoogleGenerativeAIEmbeddings;
let togetherEmbeddings: TogetherAIEmbeddings;

function initializeEmbeddingClients() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required for migration');
  }
  
  geminiEmbeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: "models/embedding-001",
  });
  
  // Only initialize TogetherAI if we have the key (for fallback)
  if (process.env.TOGETHER_API_KEY) {
    togetherEmbeddings = new TogetherAIEmbeddings({
      apiKey: process.env.TOGETHER_API_KEY,
      model: "togethercomputer/m2-bert-80M-32k-retrieval",
    });
  }
}

async function generateGeminiEmbedding(text: string): Promise<number[]> {
  for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
    try {
      const embedding = await geminiEmbeddings.embedQuery(text);
      console.log(`✓ Generated Gemini embedding (${embedding.length} dim)`);
      return embedding;
    } catch (error) {
      console.error(`Attempt ${i + 1}/${CONFIG.MAX_RETRIES} failed:`, error);
      if (i === CONFIG.MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Failed to generate embedding after retries');
}

async function backupVectorData() {
  console.log('📦 Starting data backup...');
  
  try {
    // Backup DocumentVector table
    const vectors = await prisma.documentVector.findMany({
      select: {
        id: true,
        documentId: true,
        knowledgeBaseId: true,
        chatbotId: true,
        chunkIndex: true,
        content: true,
        metadata: true,
      }
    });
    
    const backupFile = join(CONFIG.BACKUP_DIR, `vectors-backup-${Date.now()}.json`);
    const fs = await import('fs').then(mod => mod.promises);
    await fs.writeFile(backupFile, JSON.stringify(vectors, null, 2));
    
    console.log(`✅ Backup completed: ${vectors.length} vectors saved to ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

interface MigrationStats {
  totalVectors: number;
  migratedVectors: number;
  failedVectors: number;
  skippedVectors: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

async function migrateEmbeddings(
  chatbotId?: string,
  knowledgeBaseId?: string
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalVectors: 0,
    migratedVectors: 0,
    failedVectors: 0,
    skippedVectors: 0,
    startTime: new Date(),
  };

  try {
    console.log('🚀 Starting Gemini embedding migration...');
    
    // Build query conditions
    const where: any = {};
    if (chatbotId) where.chatbotId = chatbotId;
    if (knowledgeBaseId) where.knowledgeBaseId = knowledgeBaseId;
    
    // Get total count
    stats.totalVectors = await prisma.documentVector.count({ where });
    console.log(`📊 Total vectors to migrate: ${stats.totalVectors}`);
    
    if (stats.totalVectors === 0) {
      console.log('⚠️ No vectors found to migrate');
      return stats;
    }
    
    // Process in batches
    let offset = 0;
    let batchNumber = 1;
    
    while (offset < stats.totalVectors) {
      console.log(`\n🔄 Processing batch ${batchNumber} (offset: ${offset})`);
      
      // Fetch batch of vectors
      const vectors = await prisma.documentVector.findMany({
        where,
        select: {
          id: true,
          content: true,
          chatbotId: true,
          knowledgeBaseId: true,
          documentId: true,
          chunkIndex: true,
          metadata: true,
        },
        skip: offset,
        take: CONFIG.BATCH_SIZE,
        orderBy: { createdAt: 'asc' }
      });
      
      if (vectors.length === 0) break;
      
      // Process this batch
      const batchPromises = vectors.map(async (vector) => {
        try {
          console.log(`  Processing vector ${vector.id}...`);
          
          // Generate new Gemini embedding
          const newEmbedding = await generateGeminiEmbedding(vector.content);
          
          // Update in database
          await prisma.$executeRaw`
            UPDATE "DocumentVector" 
            SET "embedding" = ${`[${newEmbedding.join(',')}]`}::vector(768)
            WHERE "id" = ${vector.id}
          `;
          
          stats.migratedVectors++;
          console.log(`  ✓ Migrated vector ${vector.id}`);
          
          return { success: true, id: vector.id };
        } catch (error) {
          console.error(`  ✗ Failed to migrate vector ${vector.id}:`, error);
          stats.failedVectors++;
          
          // Save failed vector info for retry
          await prisma.$executeRaw`
            INSERT INTO "_MigrationFailedVectors" (id, vector_id, error, created_at)
            VALUES (gen_random_uuid()::text, ${vector.id}, ${String(error)}, NOW())
            ON CONFLICT (vector_id) DO UPDATE SET
              error = EXCLUDED.error,
              retry_count = "_MigrationFailedVectors".retry_count + 1,
              updated_at = NOW()
          `;
          
          return { success: false, id: vector.id, error };
        }
      });
      
      await Promise.all(batchPromises);
      
      offset += vectors.length;
      batchNumber++;
      
      // Progress report
      const progress = ((offset / stats.totalVectors) * 100).toFixed(1);
      console.log(`📈 Progress: ${progress}% (${offset}/${stats.totalVectors})`);
      
      // Delay between batches (rate limiting)
      if (offset < stats.totalVectors) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }
    
    stats.endTime = new Date();
    stats.durationMs = stats.endTime.getTime() - stats.startTime.getTime();
    
    console.log('\n✅ Migration completed!');
    console.log(`   Total: ${stats.totalVectors}`);
    console.log(`   Success: ${stats.migratedVectors}`);
    console.log(`   Failed: ${stats.failedVectors}`);
    console.log(`   Duration: ${(stats.durationMs / 1000).toFixed(1)} seconds`);
    
    // Save migration report
    await saveMigrationReport(stats);
    
    return stats;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    stats.endTime = new Date();
    stats.durationMs = stats.endTime.getTime() - stats.startTime.getTime();
    await saveMigrationReport(stats, error);
    throw error;
  }
}

async function saveMigrationReport(stats: MigrationStats, error?: any) {
  try {
    const report = {
      ...stats,
      error: error ? String(error) : undefined,
      timestamp: new Date().toISOString(),
    };
    
    const fs = await import('fs').then(mod => mod.promises);
    const reportFile = join(CONFIG.LOG_DIR, `migration-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📄 Migration report saved: ${reportFile}`);
  } catch (e) {
    console.error('Failed to save migration report:', e);
  }
}

async function updateChatbotModels() {
  console.log('\n🔄 Updating chatbot models to use Gemini...');
  
  try {
    // Update chatbots to use Gemini models
    const result = await prisma.chatbot.updateMany({
      where: {
        OR: [
          { model: { contains: 'meta-llama' } },
          { model: { contains: 'mistral' } },
          { model: { contains: 'together' } },
        ]
      },
      data: {
        model: 'gemini-1.5-flash',
        // Optional: Adjust temperature for Gemini
        temperature: 0.7,
        // Optional: Adjust max tokens for Gemini
        max_tokens: 1024,
      }
    });
    
    console.log(`✅ Updated ${result.count} chatbots to use Gemini`);
    
    // Also update any hardcoded model references in prompts/config
    const updatedChatbots = await prisma.chatbot.findMany({
      where: { model: 'gemini-1.5-flash' }
    });
    
    console.log(`📋 Updated chatbots: ${updatedChatbots.map(c => c.name).join(', ')}`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to update chatbot models:', error);
    throw error;
  }
}

async function createMigrationTable() {
  console.log('🔧 Setting up migration tracking...');
  
  try {
    // Create a table to track migration progress
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_MigrationHistory" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        migration_name TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Create table for failed vectors
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_MigrationFailedVectors" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        vector_id TEXT NOT NULL UNIQUE,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log('✅ Migration tables created');
  } catch (error) {
    console.error('❌ Failed to create migration tables:', error);
  }
}

async function retryFailedMigrations() {
  console.log('\n🔄 Retrying failed migrations...');
  
  try {
    const failedVectors = await prisma.$queryRaw<Array<{
      id: string;
      vector_id: string;
      error: string;
      retry_count: number;
    }>>`
      SELECT * FROM "_MigrationFailedVectors"
      WHERE retry_count < 3
      ORDER BY retry_count ASC
    `;
    
    console.log(`Found ${failedVectors.length} failed vectors to retry`);
    
    let retrySuccess = 0;
    let retryFailed = 0;
    
    for (const failed of failedVectors) {
      try {
        // Get the vector content
        const vector = await prisma.documentVector.findUnique({
          where: { id: failed.vector_id },
          select: { content: true }
        });
        
        if (!vector) {
          console.log(`  ⚠️ Vector ${failed.vector_id} not found, skipping`);
          continue;
        }
        
        // Regenerate embedding
        const newEmbedding = await generateGeminiEmbedding(vector.content);
        
        // Update the vector
        await prisma.$executeRaw`
          UPDATE "DocumentVector" 
          SET "embedding" = ${`[${newEmbedding.join(',')}]`}::vector(768)
          WHERE "id" = ${failed.vector_id}
        `;
        
        // Remove from failed table
        await prisma.$executeRaw`
          DELETE FROM "_MigrationFailedVectors" WHERE vector_id = ${failed.vector_id}
        `;
        
        retrySuccess++;
        console.log(`  ✓ Retry successful for ${failed.vector_id}`);
      } catch (error) {
        retryFailed++;
        console.error(`  ✗ Retry failed for ${failed.vector_id}:`, error);
        
        // Update retry count
        await prisma.$executeRaw`
          UPDATE "_MigrationFailedVectors" 
          SET retry_count = retry_count + 1,
              error = ${String(error)},
              updated_at = NOW()
          WHERE vector_id = ${failed.vector_id}
        `;
      }
    }
    
    console.log(`\n📊 Retry results: ${retrySuccess} success, ${retryFailed} failed`);
  } catch (error) {
    console.error('❌ Failed to retry migrations:', error);
  }
}

async function runMigration(options: {
  chatbotId?: string;
  knowledgeBaseId?: string;
  skipBackup?: boolean;
  retryOnly?: boolean;
  verifyOnly?: boolean;
}) {
  const cleanupLogging = setupLogging();
  
  try {
    console.log('🚀 Gemini Migration Tool');
    console.log('='.repeat(50));
    
    // Initialize
    initializeEmbeddingClients();
    await createMigrationTable();
    
    // Record migration start
    await prisma.$executeRaw`
      INSERT INTO "_MigrationHistory" (migration_name, status, started_at)
      VALUES ('gemini_embeddings_migration', 'IN_PROGRESS', NOW())
    `;
    
    if (options.verifyOnly) {
      return;
    }
    
    if (options.retryOnly) {
      await retryFailedMigrations();
      return;
    }
    
    // Backup (optional)
    let backupFile: string | undefined;
    if (!options.skipBackup) {
      backupFile = await backupVectorData();
    }
    
    // Run migration
    const stats = await migrateEmbeddings(options.chatbotId, options.knowledgeBaseId);
    
    // Retry failed ones
    if (stats.failedVectors > 0) {
      console.log('\n🔄 Attempting to retry failed migrations...');
      await retryFailedMigrations();
    }
    
    // Update chatbot models
    await updateChatbotModels();
    
    // Record migration completion
    await prisma.$executeRaw`
      UPDATE "_MigrationHistory" 
      SET status = 'COMPLETED',
          completed_at = NOW(),
          details = ${JSON.stringify({ stats, backupFile })}::jsonb
      WHERE migration_name = 'gemini_embeddings_migration'
      AND status = 'IN_PROGRESS'
    `;
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('Next steps:');
    console.log('1. Update your code to use Gemini SDK (already done in previous steps)');
    console.log('2. Test a few chatbot conversations');
    console.log('3. Monitor for any issues in production');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    
    await prisma.$executeRaw`
      UPDATE "_MigrationHistory" 
      SET status = 'FAILED',
          completed_at = NOW(),
          details = ${JSON.stringify({ error: String(error) })}::jsonb
      WHERE migration_name = 'gemini_embeddings_migration'
      AND status = 'IN_PROGRESS'
    `;
    
    throw error;
  } finally {
    cleanupLogging();
    await prisma.$disconnect();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options: any = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--chatbot-id' && args[i + 1]) {
      options.chatbotId = args[++i];
    } else if (arg === '--kb-id' && args[i + 1]) {
      options.knowledgeBaseId = args[++i];
    } else if (arg === '--skip-backup') {
      options.skipBackup = true;
    } else if (arg === '--retry-only') {
      options.retryOnly = true;
    } else if (arg === '--verify-only') {
      options.verifyOnly = true;
    } else if (arg === '--help') {
      console.log(`
Usage: npx tsx scripts/migrate-to-gemini.ts [options]

Options:
  --chatbot-id <id>     Migrate only specific chatbot
  --kb-id <id>         Migrate only specific knowledge base
  --skip-backup        Skip data backup (not recommended)
  --retry-only         Only retry previously failed migrations
  --verify-only        Only verify current state
  --help               Show this help message

Examples:
  npx tsx scripts/migrate-to-gemini.ts                        # Migrate all
  npx tsx scripts/migrate-to-gemini.ts --chatbot-id abc123    # Migrate specific chatbot
  npx tsx scripts/migrate-to-gemini.ts --retry-only          # Retry failed
      `);
      process.exit(0);
    }
  }
  
  try {
    await runMigration(options);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  migrateEmbeddings,
  updateChatbotModels,
  runMigration,
};