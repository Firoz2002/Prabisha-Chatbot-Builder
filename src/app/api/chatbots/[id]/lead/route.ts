// app/api/chatbots/[chatbotId]/lead-config/route.ts
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

    // Find active lead collection logic for this chatbot
    const leadLogic = await prisma.logic.findFirst({
      where: {
        chatbotId,
        type: 'COLLECT_LEADS',
        isActive: true,
      },
      include: {
        leadCollection: {
          include: {
            formFields: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
      },
    });

    if (!leadLogic || !leadLogic.leadCollection) {
      return NextResponse.json(
        { isActive: false },
        { status: 200 }
      );
    }

    const leadCollection = leadLogic.leadCollection;

    // Parse keywords from the logic config
    let triggerKeywords: string[] = [];
    if (leadLogic.keywords) {
      try {
        triggerKeywords = leadLogic.keywords;
      } catch (e) {
        console.error('Error parsing keywords:', e);
      }
    }

    // Transform form fields to the expected format
    const fields = leadCollection.formFields.map(field => ({
      id: field.id,
      type: field.type,
      label: field.label,
      required: field.required,
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
      options: field.options ? JSON.parse(field.options) : undefined,
    }));

    // Build the config object
    const config = {
      id: leadCollection.id,
      formTitle: leadCollection.formTitle,
      formDesc: leadCollection.formDesc,
      leadFormStyle: leadCollection.leadFormStyle,
      cadence: leadCollection.cadence,
      fields: JSON.stringify(fields), // Stringify for the component
      successMessage: leadCollection.successMessage,
      redirectUrl: leadCollection.redirectUrl,
      autoClose: leadCollection.autoClose,
      showThankYou: leadCollection.showThankYou,
    };

    return NextResponse.json({
      isActive: true,
      config,
      triggerType: leadLogic.triggerType,
      triggerKeywords,
      showAlways: leadLogic.showAlways,
      showAtEnd: leadLogic.showAtEnd,
      showOnButton: leadLogic.showOnButton,
    });

  } catch (error) {
    console.error('Error fetching lead config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead configuration' },
      { status: 500 }
    );
  }
}