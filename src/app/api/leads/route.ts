// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();
    const { data, formId, chatbotId, conversationId } = body;

    // Validate required fields
    if (!formId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get lead collection config to validate fields
    const leadCollection = await prisma.leadCollection.findUnique({
      where: { id: formId },
      include: {
        formFields: true,
      },
    });

    if (!leadCollection) {
      return NextResponse.json(
        { error: 'Lead form not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const errors: Record<string, string> = {};
    for (const field of leadCollection.formFields) {
      if (field.required && !data[field.id]) {
        errors[field.id] = `${field.label} is required`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Check if lead already exists for this conversation
    if (conversationId) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          chatbotId,
          conversationId,
        },
      });

      if (existingLead) {
        return NextResponse.json(
          { error: 'Lead already submitted for this conversation' },
          { status: 400 }
        );
      }
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        formId,
        chatbotId,
        data: data, // Store as JSON
        conversationId,
      },
    });

    // Update conversation with leadId if conversationId provided
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { leadId: lead.id },
      });
    }

    // Send notifications if configured
    if (leadCollection.notifyEmail) {
      // TODO: Implement email notification
      console.log('Email notification:', leadCollection.notifyEmail);
    }

    if (leadCollection.webhookUrl) {
      // TODO: Implement webhook
      console.log('Webhook:', leadCollection.webhookUrl);
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      successMessage: leadCollection.successMessage || 'Thank you! We\'ll be in touch soon.',
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to submit lead' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get('chatbotId') as string;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: { chatbotId },
        include: {
          form: {
            include: {
              formFields: true,
            },
          },
          conversation: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({
        where: { chatbotId },
      }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}