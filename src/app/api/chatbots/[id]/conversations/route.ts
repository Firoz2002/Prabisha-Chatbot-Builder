import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id } = await context.params;

    const conversations = await prisma.conversation.findMany({
      where: { 
        chatbotId: id, 
        messages: {
          some: {}
        } 
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
