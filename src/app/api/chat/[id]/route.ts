// src/app/api/chat/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Fetch conversation with messages
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // If conversation doesn't exist, return 404
    // Let the frontend handle creating a new conversation
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' }, 
        { status: 404 }
      );
    }

    // Return messages with conversation metadata
    return NextResponse.json({ 
      data: conversation.messages,
      conversationId: conversation.id,
      chatbotId: conversation.chatbotId,
      isActive: conversation.isActive
    });
    
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// Optional: Add PUT endpoint to update conversation status
export async function PUT(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        isActive: body.isActive ?? true,
        endedAt: body.isActive === false ? new Date() : null,
        ...body
      }
    });

    return NextResponse.json({ success: true, conversation });
    
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}