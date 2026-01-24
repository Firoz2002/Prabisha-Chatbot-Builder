// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper type for the JSON fields in ChatbotForm
interface FormFieldJson {
  id: string;
  label: string;
  required: boolean;
  type: string;
  placeholder?: string;
  defaultValue?: string;
  options?: any;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();
    console.log('Received lead data:', body);
    const { data, formId, chatbotId, conversationId } = body;

    // Validate required fields
    if (!formId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get chatbot form (previously LeadForm, now ChatbotForm)
    const chatbotForm = await prisma.chatbotForm.findUnique({
      where: { id: formId },
    });

    if (!chatbotForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Validate required fields based on JSON structure
    const errors: Record<string, string> = {};
    const fields = chatbotForm.fields as unknown as FormFieldJson[];

    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (field.required && !data[field.id]) {
          errors[field.id] = `${field.label} is required`;
        }
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
    if (chatbotForm.notifyEmail) {
      console.log('Email notification to:', chatbotForm.notifyEmail);
      // TODO: Implement email notification
    }

    if (chatbotForm.webhookUrl) {
      console.log('Webhook notification to:', chatbotForm.webhookUrl);
      // TODO: Implement webhook call
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      successMessage: chatbotForm.successMessage || 'Thank you! We\'ll be in touch soon.',
      redirectUrl: chatbotForm.redirectUrl,
      autoClose: chatbotForm.autoClose,
      showThankYou: chatbotForm.showThankYou,
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to submit lead' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
        
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user first to get their ID
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
    
    // PAGINATION
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // BUILD WHERE CLAUSE
    let whereClause: any = {};

    if (workspaceId) {
      // Fetch leads for a specific workspace
      whereClause = {
        chatbot: {
          workspaceId,
          workspace: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        }
      };
    } else if (chatbotId) {
      // Fetch leads for a specific chatbot
      whereClause = {
        chatbotId,
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
    } else {
      // Fetch ALL leads from all chatbots the user has access to
      whereClause = {
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
    }

    // EXECUTE QUERY
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
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
          form: {
            select: {
              id: true,
              title: true,
              description: true,
              leadTiming: true,
              leadFormStyle: true,
            }
          },
          conversation: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              messages: {
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { content: true }
              }
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({
        where: whereClause,
      }),
    ]);

    // Format the leads with conversation preview
    const formattedLeads = leads.map(lead => ({
      ...lead,
      conversationPreview: lead.conversation?.messages?.[0]?.content?.substring(0, 100) || '',
      workspace: lead.chatbot.workspace,
    }));

    return NextResponse.json({
      leads: formattedLeads,
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

// DELETE endpoint to delete a lead
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
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Check if user has access to this lead
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
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

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the lead
    await prisma.lead.delete({
      where: { id: leadId }
    });

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}