// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeSearchChain, simpleSearch } from '@/lib/langchain/chains/search-chain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.input;
    const chatbotId = body.chatbotId;
    let conversationId = body.conversationId; // Might be null/undefined
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID required' }, { status: 400 });
    }

    // Fetch chatbot to verify it exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        knowledgeBases: true,
        logic: true
      }
    });

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // If conversationId provided, verify it exists and belongs to this chatbot
    if (conversationId) {
      const existingConversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      
      if (!existingConversation) {
        // Conversation not found, reset to null so new one gets created
        conversationId = null;
      } else if (existingConversation.chatbotId !== chatbotId) {
        return NextResponse.json(
          { error: 'Conversation does not belong to this chatbot' },
          { status: 403 }
        );
      }
    }

    // Execute search chain - it will handle conversation creation if needed
    const result = await executeSearchChain({
      chatbotId,
      conversationId, // Might be null
      userMessage: message,
    });

    const responseData: any = {
      message: result.response,
      response: result.response,
      conversationId: result.conversationId, // Always return the conversationId
    };

    if (result.triggeredLogics?.length) {
      responseData.logicTriggers = result.triggeredLogics.map(logic => ({
        id: logic.id,
        type: logic.type,
        name: logic.name,
        config: logic.config,
        linkButton: logic.linkButton,
        meetingSchedule: logic.meetingSchedule,
        leadCollection: logic.leadCollection
      }));
    }

    if (result.sourceUrls?.length) {
      responseData.sourceUrls = result.sourceUrls;
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    let errorMessage = 'Failed to process message';
    let statusCode = 500;
    
    if (error.message?.includes('Chatbot not found')) {
      errorMessage = 'Chatbot not found';
      statusCode = 404;
    } else if (error.message?.includes('API key')) {
      errorMessage = 'AI service configuration error';
      statusCode = 503;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded';
      statusCode = 429;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: statusCode }
    );
  }
}

// New search-only endpoint
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const chatbotId = searchParams.get('chatbotId');
    const conversationId = searchParams.get('conversationId');

    if (!query || !chatbotId) {
      return NextResponse.json(
        { error: 'query and chatbotId required' },
        { status: 400 }
      );
    }

    // If conversationId provided, fetch conversation messages
    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 }}
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      if (conversation.chatbotId !== chatbotId) {
        return NextResponse.json(
          { error: 'Conversation does not belong to this chatbot' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        data: conversation.messages,
        conversationId: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt
      });
    } else {
      // Simple search without conversation context
      const results = await simpleSearch(chatbotId, query, {
        limit: parseInt(searchParams.get('limit') || '10'),
        threshold: parseFloat(searchParams.get('threshold') || '0.65'),
        includeKnowledgeBaseNames: searchParams.get('includeKbNames') === 'true'
      });

      return NextResponse.json({
        results,
        query,
        chatbotId,
        count: results.length
      });
    }

  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, isActive, metadata } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(metadata && { metadata }),
        ...(isActive === false && { endedAt: new Date() })
      }
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      isActive: conversation.isActive,
      endedAt: conversation.endedAt
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}