// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper type for the JSON fields in LeadForm
interface FormFieldJson {
  id: string;
  label: string;
  required: boolean;
  type: string;
}

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

    // Get lead form (Corrected from LeadCollection to LeadForm to match Lead relation)
    const leadForm = await prisma.leadForm.findUnique({
      where: { id: formId },
    });

    if (!leadForm) {
      return NextResponse.json(
        { error: 'Lead form not found' },
        { status: 404 }
      );
    }

    // Validate required fields based on JSON structure
    const errors: Record<string, string> = {};
    const fields = leadForm.fields as unknown as FormFieldJson[];

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

    // Send notifications if configured (LeadForm doesn't have notifyEmail in schema provided, but kept logic if schema updates)
    // Note: If you want these fields, add them to LeadForm in schema.prisma
    /* if (leadForm.notifyEmail) {
      console.log('Email notification:', leadForm.notifyEmail);
    }
    */

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      successMessage: 'Thank you! We\'ll be in touch soon.', // Default message as LeadForm might not have successMessage
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
    
    // PAGINATION
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // BUILD WHERE CLAUSE
    let whereClause: any = {};

    if (chatbotId) {
      // Option 1: Fetch leads for a specific chatbot
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
      // Option 2: Fetch ALL leads from all chatbots the user has access to
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
          // --- FIX APPLIED HERE ---
          // Removed 'include: { formFields: true }' because Lead relates to LeadForm, 
          // which has 'fields' (JSON), not a relation to 'formFields'.
          form: true, 
          conversation: {
            select: {
              id: true,
              title: true,
              createdAt: true,
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