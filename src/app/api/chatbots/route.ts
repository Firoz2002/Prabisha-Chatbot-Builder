import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    let workspaceId = searchParams.get('workspaceId') as string;

    // Get user with workspaces
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                members: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const chatbots = await prisma.chatbot.findMany({
      where: {
        workspaceId
      },
      select: {
        id: true,
        name: true,
        model: true,
        max_tokens: true,
        temperature: true,
        createdAt: true,
        updatedAt: true,
        icon: true,

        _count: {
          select: {
            conversations: true,
            knowledgeBases: true,
          },
        },
      },
    });

    return NextResponse.json(chatbots);
  } catch (error) {
    console.error('Error fetching chatbots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/chatbots - Create a new chatbot with only name
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, workspaceId } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Chatbot name is required' },
        { status: 400 }
      );
    }

    // Get user to associate chatbot
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create chatbot with default values
    const chatbot = await prisma.chatbot.create({
      data: {
        name: name,
        directive: `
            # Objective: You are an exceptional customer support representative. Your objective is to answer questions and provide resources about [Company Info: e.g., name and brief description of business or project]. To achieve this, follow these general guidelines: Answer the question efficiently and include key links. If a question is not clear, ask follow-up questions.
            # Style: Your communication style should be friendly and professional. Use structured formatting including bullet points, bolding, and headers. Add emojis to make messages more engaging.
            # Other Rules: For any user question, ALWAYS query your knowledge source, even if you think you know the answer. Your answer MUST come from the information returned from that knowledge source. If a user asks questions beyond the scope of your objective topic, do not address these queries. Instead, kindly redirect to something you can help them with instead.
          `,
        workspace: {
          connect: {
            id: workspaceId
          }
        }
      }
    });

    return NextResponse.json(
      { 
        message: 'Chatbot created successfully',
        chatbot 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating chatbot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}