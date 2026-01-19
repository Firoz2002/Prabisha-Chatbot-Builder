import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { deleteKnowledgeBase } from '@/lib/langchain/vector-store';

interface RouterParams {
  params: Promise<{ knowledgeId: string }>
}

export async function DELETE(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { knowledgeId } = await context.params;
    if (!knowledgeId) {
      return NextResponse.json({ error: 'Knowledge base ID is required' }, { status: 400 });
    }

    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: {
        id: knowledgeId,
      },
    });
    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    const deleteResult = await deleteKnowledgeBase(knowledgeId);
    console.log(`Deleted ${deleteResult.deletedCount} vector documents from MongoDB for knowledge base ${knowledgeId}`);
    
    // First delete all documents in the knowledge base
    await prisma.document.deleteMany({
      where: {
        knowledgeBaseId: knowledgeId,
      },
    });

    // Then delete the knowledge base
    await prisma.knowledgeBase.delete({
      where: {
        id: knowledgeId,
      },
      include: {
        documents: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete knowledge base:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge base' },
      { status: 500 }
    )
  }
}