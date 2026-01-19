import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { deleteDocument } from '@/lib/langchain/vector-store';

interface RouterParams {
  params: Promise<{ knowledgeId: string; documentId: string }>
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
    
    const { knowledgeId, documentId } = await context.params;
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

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        knowledgeBaseId: knowledgeId,
      },
    });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await deleteDocument(document.id);
    await prisma.document.deleteMany({
      where: {
        id: documentId,
        knowledgeBaseId: knowledgeId,
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