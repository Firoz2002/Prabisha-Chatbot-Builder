import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { chatbotId } = body;

    if (!chatbotId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newConversation = await prisma.conversation.create({
      data: {
        chatbotId,
      },
    });

    return NextResponse.json(newConversation);

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
