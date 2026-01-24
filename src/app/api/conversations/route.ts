import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get('chatbotId');
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Build the where clause
    let whereClause: any = {
      chatbot: {
        workspace: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      }
    };

    // Add optional filters
    if (chatbotId) {
      whereClause.chatbotId = chatbotId;
    }

    if (workspaceId) {
      whereClause.chatbot.workspaceId = workspaceId;
    }

    // Fetch conversations
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        include: {
          chatbot: {
            select: {
              id: true,
              name: true,
              workspace: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          lead: {
            select: {
              id: true,
              createdAt: true,
              data: true
            }
          },
          _count: {
            select: { messages: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: {
              content: true,
              senderType: true
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.conversation.count({
        where: whereClause,
      }),
    ]);

    // Format conversations with additional data
    const formattedConversations = conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      chatbot: conversation.chatbot,
      workspace: conversation.chatbot.workspace,
      lead: conversation.lead,
      isActive: conversation.isActive,
      messageCount: conversation._count.messages,
      firstMessage: conversation.messages[0]?.content || null,
      firstMessageType: conversation.messages[0]?.senderType || null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      endedAt: conversation.endedAt,
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add a DELETE endpoint to delete conversations
export async function DELETE(
  request: NextRequest,
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if the user has access to this conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        chatbot: {
          workspace: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        }
      },
      include: {
        chatbot: {
          select: {
            workspaceId: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the conversation (this will cascade delete messages due to schema relations)
    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}