// app/api/chat/route.ts
import { searchSimilar } from "@/lib/langchain/vector-store";
import { NextRequest, NextResponse } from 'next/server';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { generateText } from 'ai';
import prisma from '@/lib/prisma';

const togetherai = createTogetherAI({
  apiKey: process.env.TOGETHER_AI_API_KEY ?? '',
});

// System prompt generator based on chatbot configuration
function generateSystemPrompt(chatbot: any, context: any = {}) {
  const basePrompt = chatbot.directive || 
    "You are a helpful assistant. Answer questions clearly and concisely.";
  
  const knowledgeContext = chatbot.knowledgeBases?.length > 0 
    ? "Use the provided knowledge base information to answer questions accurately."
    : "";
  
  const greeting = chatbot.greeting 
    ? `Start conversations with: "${chatbot.greeting}"`
    : "";
  
  const personality = chatbot.description 
    ? `Your personality: ${chatbot.description}`
    : "";
  
  const modelConfig = `Use model settings: temperature=${chatbot.temperature || 0.7}, max_tokens=${chatbot.max_tokens || 500}`;
  
  return `
${basePrompt}

${personality}
${knowledgeContext}
${greeting}
${modelConfig}

Respond in a friendly, helpful manner. If you don't know something, say so.
Format responses clearly with proper paragraphs, bullet points, or numbered lists when appropriate.
`;
}

// Enhanced response generator
async function generateResponse(
  chatbot: any, 
  userMessage: string, 
  conversationId: string,
  context: any = {}
) {
  try {
    // Get conversation history for context
    const conversationHistory = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 10 // Last 10 messages
    });

    // Format conversation history
    const history = conversationHistory.map(msg => ({
      role: msg.senderType === 'USER' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));

    // Search knowledge bases for relevant information
    let knowledgeResults: string[] = [];
    if (chatbot.knowledgeBases && chatbot.knowledgeBases.length > 0) {
      for (const kb of chatbot.knowledgeBases) {
        try {
          const results = await searchSimilar({
            query: userMessage,
            chatbotId: chatbot.id,
            knowledgeBaseId: kb.id,
            limit: 3,
          });
          knowledgeResults.push(...results.map((r: any) => r.content));
        } catch (kbError) {
          console.error(`Error searching knowledge base ${kb.name}:`, kbError);
        }
      }
    }

    // Combine knowledge base results
    const knowledgeContext = knowledgeResults.length > 0
      ? `Relevant information from knowledge base:\n${knowledgeResults.join('\n\n')}`
      : '';

    // Check for logic triggers
    const activeLogics = chatbot.logics || [];
    let logicContext = '';
    
    for (const logic of activeLogics) {
      // Check keyword triggers
      if (logic.triggerType === 'KEYWORD' && logic.keywords) {
        try {
          const keywords = JSON.parse(logic.keywords) as string[];
          const hasKeyword = keywords.some(keyword => 
            userMessage.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (hasKeyword) {
            switch (logic.type) {
              case 'COLLECT_LEADS':
                logicContext += '\n[User might be interested in providing contact information.]\n';
                break;
              case 'LINK_BUTTON':
                if (logic.linkButton) {
                  logicContext += `\n[Consider mentioning: ${logic.linkButton.buttonText} (${logic.linkButton.buttonLink})]\n`;
                }
                break;
              case 'SCHEDULE_MEETING':
                if (logic.meetingSchedule) {
                  logicContext += `\n[User might want to schedule a meeting: ${logic.meetingSchedule.calendarLink}]\n`;
                }
                break;
            }
          }
        } catch (e) {
          console.error('Error parsing logic keywords:', e);
        }
      }
    }

    // Prepare final prompt
    const systemPrompt = generateSystemPrompt(chatbot, context);
    
    const fullPrompt = `${systemPrompt}

${knowledgeContext}

${logicContext}

Current time: ${new Date().toLocaleString()}

Conversation history:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

User: ${userMessage}

Assistant:`;

    // Generate response using Together AI
    const { text } = await generateText({
      model: togetherai(chatbot.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'),
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: userMessage }
      ],
      maxOutputTokens: chatbot.max_tokens || 500,
      temperature: chatbot.temperature || 0.7,
    });

    // Apply any post-processing (e.g., adding logic buttons)
    let finalResponse = text;
    
    // Add logic-based suggestions to response if applicable
    const logicSuggestions: string[] = [];
    
    for (const logic of activeLogics) {
      if (logic.showAlways || logic.showAtEnd) {
        switch (logic.type) {
          case 'LINK_BUTTON':
            if (logic.linkButton) {
              logicSuggestions.push(`[${logic.linkButton.buttonText}](${logic.linkButton.buttonLink})`);
            }
            break;
          case 'SCHEDULE_MEETING':
            if (logic.meetingSchedule) {
              logicSuggestions.push(`Schedule a meeting: ${logic.meetingSchedule.calendarLink}`);
            }
            break;
        }
      }
    }
    
    if (logicSuggestions.length > 0) {
      finalResponse += `\n\n**Suggestions:**\n${logicSuggestions.map(s => `• ${s}`).join('\n')}`;
    }

    return finalResponse;

  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

// Check for logic triggers separately (for immediate actions)
async function checkLogicTriggers(chatbot: any, userMessage: string) {
  const triggeredLogics: any[] = [];
  
  for (const logic of chatbot.logics || []) {
    if (logic.triggerType === 'KEYWORD' && logic.keywords) {
      try {
        const keywords = JSON.parse(logic.keywords) as string[];
        const hasKeyword = keywords.some(keyword => 
          userMessage.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          triggeredLogics.push(logic);
        }
      } catch (e) {
        console.error('Error parsing logic keywords:', e);
      }
    }
  }
  
  return triggeredLogics;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.input;
    const chatbotId = body.chatbotId;
    const conversationId = body.conversationId;
    const context = body.context;

    console.log('Received message:', message);

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!chatbotId) {
      return NextResponse.json(
        { error: 'Chatbot ID is required' },
        { status: 400 }
      );
    }

    // Get chatbot with configurations
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        knowledgeBases: {
          include: { documents: true }
        },
        flows: {
          include: {
            nodes: true,
            edges: true
          }
        },
        logics: {
          where: { isActive: true },
          include: {
            linkButton: true,
            meetingSchedule: true,
            leadCollection: {
              include: {
                formFields: true
              }
            }
          }
        }
      }
    });

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Create or get conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            chatbotId,
            title: message.substring(0, 50),
            metadata: context
          }
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId,
          title: message.substring(0, 50),
          metadata: context
        }
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        content: message,
        senderType: 'USER',
        conversationId: conversation.id
      }
    });

    // Check for immediate logic triggers
    const triggeredLogics = await checkLogicTriggers(chatbot, message);
    
    // Generate AI response
    const aiResponse = await generateResponse(
      chatbot, 
      message, 
      conversation.id,
      context
    );

    // Save bot response
    await prisma.message.create({
      data: {
        content: aiResponse,
        senderType: 'BOT',
        conversationId: conversation.id
      }
    });

    // Prepare response with logic triggers
    const responseData: any = {
      message: aiResponse,
      response: aiResponse,
      conversationId: conversation.id,
      chatbotId: chatbot.id,
      chatbotName: chatbot.name
    };

    // Add logic triggers to response if any
    if (triggeredLogics.length > 0) {
      responseData.logicTriggers = triggeredLogics.map(logic => ({
        id: logic.id,
        type: logic.type,
        name: logic.name,
        config: logic.config,
        linkButton: logic.linkButton,
        meetingSchedule: logic.meetingSchedule,
        leadCollection: logic.leadCollection
      }));
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process message';
    let statusCode = 500;
    
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      errorMessage = 'AI service configuration error';
      statusCode = 503;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}

// Optional: GET endpoint to fetch conversation history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const chatbotId = searchParams.get('chatbotId');

    if (!conversationId || !chatbotId) {
      return NextResponse.json(
        { error: 'conversationId and chatbotId are required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Limit to last 50 messages
        }
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify conversation belongs to chatbot
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

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// Optional: PUT endpoint to update conversation (e.g., mark as ended)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, isActive, metadata } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}