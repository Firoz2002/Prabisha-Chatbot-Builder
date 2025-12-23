import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch chatbots (you might want to add workspace relation to chatbot model)
    // For now, fetching all chatbots - adjust based on your business logic
    const chatbots = await prisma.chatbot.findMany({
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        flows: {
          take: 1
        },
        knowledgeBases: {
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(await prisma.chatbot.findMany());

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
    const { name } = body;

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