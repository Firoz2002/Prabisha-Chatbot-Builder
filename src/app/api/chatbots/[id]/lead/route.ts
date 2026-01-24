// app/api/chatbots/[chatbotId]/lead-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '../../../../../../generated/prisma/browser';

interface RouterParams {
  params: Promise<{ id: string }>;
}

// Helper function to safely parse JSON fields
const safelyParseJson = (field: any) => {
  if (!field && field !== '') return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      console.error('Error parsing JSON field:', e);
      return field; // Return the string as-is if parsing fails
    }
  }
  return field; // Already an object
};

// Helper function to safely stringify JSON
const safelyStringifyJson = (field: any) => {
  if (!field && field !== '') return null;
  if (typeof field === 'string') {
    // Check if it's already valid JSON
    try {
      JSON.parse(field);
      return field; // Already valid JSON string
    } catch (e) {
      // Not valid JSON, stringify it
      return JSON.stringify(field);
    }
  }
  return JSON.stringify(field); // Object, needs stringification
};

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id: chatbotId } = await context.params;

    // Get the chatbot logic configuration AND the chatbot form
    const [chatbotLogic, chatbotForm] = await Promise.all([
      prisma.chatbotLogic.findUnique({
        where: { chatbotId },
      }),
      prisma.chatbotForm.findUnique({
        where: { chatbotId },
      }),
    ]);

    if (!chatbotLogic || !chatbotLogic.leadCollectionEnabled) {
      return NextResponse.json(
        { isActive: false },
        { status: 200 }
      );
    }

    // Safely parse JSON fields
    const leadCollectionConfig = safelyParseJson(chatbotLogic.leadCollectionConfig);
    const triggers = safelyParseJson(chatbotLogic.triggers);

    // Extract trigger information
    let triggerType = 'MANUAL'; // Default trigger type
    let triggerKeywords: string[] = [];
    let showAlways = false;
    let showAtEnd = false;
    let showOnButton = false;

    if (triggers && Array.isArray(triggers)) {
      // Find lead collection trigger
      const leadTrigger = triggers.find((trigger: any) => 
        trigger.type === 'COLLECT_LEADS' || trigger.feature === 'leadCollection'
      );
      
      if (leadTrigger) {
        triggerType = leadTrigger.triggerType || 'MANUAL';
        triggerKeywords = leadTrigger.keywords || [];
        showAlways = leadTrigger.showAlways || false;
        showAtEnd = leadTrigger.showAtEnd || false;
        showOnButton = leadTrigger.showOnButton || false;
      }
    }

    // If no lead collection config exists, return default structure
    if (!leadCollectionConfig) {
      return NextResponse.json({
        isActive: true,
        config: {
          id: chatbotForm?.id || '', // Add form ID here
          formTitle: 'Get started',
          formDesc: '',
          leadFormStyle: 'EMBEDDED',
          cadence: 'ALL_AT_ONCE',
          fields: '[]',
          successMessage: 'Thank you! We\'ll be in touch soon.',
          redirectUrl: '',
          autoClose: true,
          showThankYou: true,
          notifyEmail: '',
          webhookUrl: '',
        },
        triggerType,
        triggerKeywords,
        showAlways,
        showAtEnd,
        showOnButton,
      });
    }

    // Build the config object
    const config = {
      id: chatbotForm?.id || '', // Add form ID here
      formTitle: leadCollectionConfig.formTitle || 'Get started',
      formDesc: leadCollectionConfig.formDesc || '',
      leadFormStyle: leadCollectionConfig.leadFormStyle || 'EMBEDDED',
      cadence: leadCollectionConfig.cadence || 'ALL_AT_ONCE',
      fields: leadCollectionConfig.fields ? JSON.stringify(leadCollectionConfig.fields) : '[]',
      successMessage: leadCollectionConfig.successMessage || 'Thank you! We\'ll be in touch soon.',
      redirectUrl: leadCollectionConfig.redirectUrl || '',
      autoClose: leadCollectionConfig.autoClose !== undefined ? leadCollectionConfig.autoClose : true,
      showThankYou: leadCollectionConfig.showThankYou !== undefined ? leadCollectionConfig.showThankYou : true,
      notifyEmail: leadCollectionConfig.notifyEmail || '',
      webhookUrl: leadCollectionConfig.webhookUrl || '',
    };

    return NextResponse.json({
      isActive: true,
      config,
      triggerType,
      triggerKeywords,
      showAlways,
      showAtEnd,
      showOnButton,
    });

  } catch (error) {
    console.error('Error fetching lead config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead configuration' },
      { status: 500 }
    );
  }
}

// POST endpoint to update lead configuration
export async function POST(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id: chatbotId } = await context.params;
    const body = await request.json();

    // Get or create chatbot logic configuration
    let chatbotLogic = await prisma.chatbotLogic.findUnique({
      where: { chatbotId },
    });

    // Parse config data to ensure it's properly stringified
    const leadCollectionConfig = body.config ? safelyStringifyJson(body.config) : null;

    if (!chatbotLogic) {
      // Create new chatbot logic with lead collection enabled
      chatbotLogic = await prisma.chatbotLogic.create({
        data: {
          chatbotId,
          name: 'Lead Collection',
          description: 'Lead collection configuration',
          isActive: true,
          leadCollectionEnabled: true,
          leadCollectionConfig: leadCollectionConfig ? JSON.parse(leadCollectionConfig) : {}, // Use empty object if null
        },
      });
    } else {
      // Update existing logic
      chatbotLogic = await prisma.chatbotLogic.update({
        where: { id: chatbotLogic.id },
        data: {
          leadCollectionEnabled: true,
          leadCollectionConfig: leadCollectionConfig ? JSON.parse(leadCollectionConfig) : {},
        },
      });
    }

    // Also create or update the chatbot form if needed
    if (body.config) {
      const config = typeof body.config === 'string' ? JSON.parse(body.config) : body.config;
      
      await prisma.chatbotForm.upsert({
        where: { chatbotId },
        update: {
          title: config.formTitle || 'Get started',
          description: config.formDesc,
          fields: config.fields ? JSON.parse(config.fields) : [],
          leadTiming: 'BEGINNING', // Default
          leadFormStyle: config.leadFormStyle || 'EMBEDDED',
          cadence: config.cadence || 'ALL_AT_ONCE',
          successMessage: config.successMessage,
          redirectUrl: config.redirectUrl,
          autoClose: config.autoClose !== undefined ? config.autoClose : true,
          showThankYou: config.showThankYou !== undefined ? config.showThankYou : true,
          notifyEmail: config.notifyEmail,
          webhookUrl: config.webhookUrl,
        },
        create: {
          chatbotId,
          title: config.formTitle || 'Get started',
          description: config.formDesc,
          fields: config.fields ? JSON.parse(config.fields) : [],
          leadTiming: 'BEGINNING',
          leadFormStyle: config.leadFormStyle || 'EMBEDDED',
          cadence: config.cadence || 'ALL_AT_ONCE',
          successMessage: config.successMessage,
          redirectUrl: config.redirectUrl,
          autoClose: config.autoClose !== undefined ? config.autoClose : true,
          showThankYou: config.showThankYou !== undefined ? config.showThankYou : true,
          notifyEmail: config.notifyEmail,
          webhookUrl: config.webhookUrl,
        },
      });
    }

    // Safely parse existing triggers
    let triggers = safelyParseJson(chatbotLogic.triggers) || [];
    if (!Array.isArray(triggers)) {
      triggers = [];
    }

    // Update or create lead collection trigger
    const leadTriggerIndex = triggers.findIndex((trigger: any) => 
      trigger.type === 'COLLECT_LEADS' || trigger.feature === 'leadCollection'
    );

    const leadTrigger = {
      feature: 'leadCollection',
      type: 'COLLECT_LEADS',
      triggerType: body.triggerType || 'MANUAL',
      keywords: body.triggerKeywords || [],
      showAlways: body.showAlways || false,
      showAtEnd: body.showAtEnd || false,
      showOnButton: body.showOnButton || false,
      isActive: true,
    };

    if (leadTriggerIndex >= 0) {
      triggers[leadTriggerIndex] = leadTrigger;
    } else {
      triggers.push(leadTrigger);
    }

    // Update triggers - ensure it's stringified
    const triggersString = safelyStringifyJson(triggers);
    await prisma.chatbotLogic.update({
      where: { id: chatbotLogic.id },
      data: {
        triggers: triggersString ? JSON.parse(triggersString) : [],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead configuration updated successfully',
    });

  } catch (error) {
    console.error('Error updating lead config:', error);
    return NextResponse.json(
      { error: 'Failed to update lead configuration' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to disable lead collection
export async function DELETE(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id: chatbotId } = await context.params;

    // Get chatbot logic
    const chatbotLogic = await prisma.chatbotLogic.findUnique({
      where: { chatbotId },
    });

    if (!chatbotLogic) {
      return NextResponse.json(
        { error: 'Chatbot logic not found' },
        { status: 404 }
      );
    }

    // Safely parse existing triggers
    let triggers = safelyParseJson(chatbotLogic.triggers) || [];
    if (!Array.isArray(triggers)) {
      triggers = [];
    }

    // Remove lead collection trigger
    triggers = triggers.filter((trigger: any) => 
      !(trigger.type === 'COLLECT_LEADS' || trigger.feature === 'leadCollection')
    );

    // Update chatbot logic - use Prisma.JsonNull for JSON fields
    await prisma.chatbotLogic.update({
      where: { id: chatbotLogic.id },
      data: {
        leadCollectionEnabled: false,
        leadCollectionConfig: Prisma.JsonNull,
        triggers: triggers.length > 0 ? JSON.stringify(triggers) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead collection disabled successfully',
    });

  } catch (error) {
    console.error('Error disabling lead collection:', error);
    return NextResponse.json(
      { error: 'Failed to disable lead collection' },
      { status: 500 }
    );
  }
}