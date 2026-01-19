import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id: chatbotId } = await context.params;
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Find active lead collection logic for this chatbot
    const leadLogic = await prisma.logic.findFirst({
      where: {
        chatbotId,
        type: 'COLLECT_LEADS',
        isActive: true,
      },
    });

    if (!leadLogic) {
      return NextResponse.json({ shouldShowForm: false });
    }

    // If trigger type is ALWAYS, it should have been shown already, 
    // but we'll return true just in case
    if (leadLogic.triggerType === 'ALWAYS') {
      return NextResponse.json({ shouldShowForm: true });
    }

    // Check message count trigger
    if (leadLogic.triggerType === 'MESSAGE_COUNT') {
      const messageCount = await prisma.message.count({
        where: { conversationId },
      });

      // Get threshold from config or default to 1
      const config = leadLogic.config as any;
      const threshold = config?.messageCountThreshold || 1;

      if (messageCount >= threshold) {
        return NextResponse.json({ shouldShowForm: true });
      }
    }

    // Keyword triggers are usually handled on the client for better UX,
    // but we can check here too if needed by looking at the last message
    if (leadLogic.triggerType === 'KEYWORD') {
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastMessage && lastMessage.senderType === 'USER' && leadLogic.keywords) {
        const keywords: string[] = leadLogic.keywords;
        const content = lastMessage.content.toLowerCase();
        
        const matches = keywords.some(keyword => 
          content.includes(keyword.toLowerCase())
        );

        if (matches) {
          return NextResponse.json({ shouldShowForm: true });
        }
      }
    }

    return NextResponse.json({ shouldShowForm: false });

  } catch (error) {
    console.error('Error checking lead requirements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
