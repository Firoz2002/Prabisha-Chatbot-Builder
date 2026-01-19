import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string; conversationId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { conversationId } = await context.params;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
