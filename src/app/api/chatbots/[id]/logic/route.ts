// app/api/chatbots/[chatbotId]/lead-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string }>;
}

// Helper function to safely parse JSON fields
const safelyParseJson = (field: any) => {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      console.error('Error parsing JSON field:', e);
      return field;
    }
  }
  return field;
};

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id: chatbotId } = await context.params;

    // Get both chatbot logic and form configuration
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
    let triggerType = 'MANUAL';
    let triggerKeywords: string[] = [];
    let showAlways = false;
    let showAtEnd = false;
    let showOnButton = false;

    if (triggers && Array.isArray(triggers)) {
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

    // Build config from either chatbotLogic.leadCollectionConfig or chatbotForm
    let config;
    
    if (leadCollectionConfig && leadCollectionConfig.formTitle) {
      // Use data from leadCollectionConfig
      config = {
        id: chatbotForm?.id || '',
        formTitle: leadCollectionConfig.formTitle || 'Get started',
        formDesc: leadCollectionConfig.formDesc || '',
        leadTiming: leadCollectionConfig.leadTiming || 'BEGINNING',
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
    } else if (chatbotForm) {
      // Use data from chatbotForm
      config = {
        id: chatbotForm.id,
        formTitle: chatbotForm.title || 'Get started',
        formDesc: chatbotForm.description || '',
        leadTiming: chatbotForm.leadTiming || 'BEGINNING',
        leadFormStyle: chatbotForm.leadFormStyle || 'EMBEDDED',
        cadence: chatbotForm.cadence || 'ALL_AT_ONCE',
        fields: chatbotForm.fields ? JSON.stringify(chatbotForm.fields) : '[]',
        successMessage: chatbotForm.successMessage || 'Thank you! We\'ll be in touch soon.',
        redirectUrl: chatbotForm.redirectUrl || '',
        autoClose: chatbotForm.autoClose !== undefined ? chatbotForm.autoClose : true,
        showThankYou: chatbotForm.showThankYou !== undefined ? chatbotForm.showThankYou : true,
        notifyEmail: chatbotForm.notifyEmail || '',
        webhookUrl: chatbotForm.webhookUrl || '',
      };
    } else {
      // Default config
      return NextResponse.json({
        isActive: true,
        config: {
          id: '',
          formTitle: 'Get started',
          formDesc: '',
          leadTiming: 'BEGINNING',
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

    console.log("Incoming logic data: ", body);

    // Get or create chatbot logic configuration
    let chatbotLogic = await prisma.chatbotLogic.findUnique({
      where: { chatbotId },
    });

    // Handle the leadCollectionConfig data
    const leadCollectionConfig = body.leadCollectionConfig;
    
    if (!leadCollectionConfig) {
      return NextResponse.json(
        { error: 'Lead collection config is required' },
        { status: 400 }
      );
    }

    // Extract trigger info from config if it exists
    const triggerInfo = leadCollectionConfig.trigger || {};
    const triggerType = triggerInfo.type || 'MANUAL';
    const triggerKeywords = triggerInfo.keywords || [];

    // Clean the config for storage (remove trigger if it exists)
    const configToStore = { ...leadCollectionConfig };
    delete configToStore.trigger;
    delete configToStore.enabled;

    const leadCollectionConfigString = JSON.stringify(configToStore);

    if (!chatbotLogic) {
      // Create new chatbot logic
      chatbotLogic = await prisma.chatbotLogic.create({
        data: {
          chatbotId,
          name: body.name || 'Lead Collection',
          description: body.description || 'Lead collection configuration',
          isActive: body.isActive !== undefined ? body.isActive : true,
          leadCollectionEnabled: body.leadCollectionEnabled !== undefined ? body.leadCollectionEnabled : true,
          leadCollectionConfig: leadCollectionConfigString,
        },
      });
    } else {
      // Update existing logic
      chatbotLogic = await prisma.chatbotLogic.update({
        where: { id: chatbotLogic.id },
        data: {
          name: body.name !== undefined ? body.name : chatbotLogic.name,
          description: body.description !== undefined ? body.description : chatbotLogic.description,
          isActive: body.isActive !== undefined ? body.isActive : chatbotLogic.isActive,
          leadCollectionEnabled: body.leadCollectionEnabled !== undefined ? body.leadCollectionEnabled : chatbotLogic.leadCollectionEnabled,
          leadCollectionConfig: leadCollectionConfigString,
        },
      });
    }

    // Create or update the ChatbotForm
    if (leadCollectionConfig) {
      const fields = leadCollectionConfig.fields || [];
      
      await prisma.chatbotForm.upsert({
        where: { chatbotId },
        update: {
          title: leadCollectionConfig.formTitle || 'Get started',
          description: leadCollectionConfig.formDesc || '',
          fields: fields,
          leadTiming: leadCollectionConfig.leadTiming || 'BEGINNING',
          leadFormStyle: leadCollectionConfig.leadFormStyle || 'EMBEDDED',
          cadence: leadCollectionConfig.cadence || 'ALL_AT_ONCE',
          successMessage: leadCollectionConfig.successMessage || 'Thank you! We\'ll be in touch soon.',
          redirectUrl: leadCollectionConfig.redirectUrl || '',
          autoClose: leadCollectionConfig.autoClose !== undefined ? leadCollectionConfig.autoClose : true,
          showThankYou: leadCollectionConfig.showThankYou !== undefined ? leadCollectionConfig.showThankYou : true,
          notifyEmail: leadCollectionConfig.notifyEmail || '',
          webhookUrl: leadCollectionConfig.webhookUrl || '',
        },
        create: {
          chatbotId,
          title: leadCollectionConfig.formTitle || 'Get started',
          description: leadCollectionConfig.formDesc || '',
          fields: fields,
          leadTiming: leadCollectionConfig.leadTiming || 'BEGINNING',
          leadFormStyle: leadCollectionConfig.leadFormStyle || 'EMBEDDED',
          cadence: leadCollectionConfig.cadence || 'ALL_AT_ONCE',
          successMessage: leadCollectionConfig.successMessage || 'Thank you! We\'ll be in touch soon.',
          redirectUrl: leadCollectionConfig.redirectUrl || '',
          autoClose: leadCollectionConfig.autoClose !== undefined ? leadCollectionConfig.autoClose : true,
          showThankYou: leadCollectionConfig.showThankYou !== undefined ? leadCollectionConfig.showThankYou : true,
          notifyEmail: leadCollectionConfig.notifyEmail || '',
          webhookUrl: leadCollectionConfig.webhookUrl || '',
        },
      });
    }

    // Handle triggers
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
      triggerType: triggerType,
      keywords: triggerKeywords,
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

    // Update triggers
    const triggersString = JSON.stringify(triggers);
    await prisma.chatbotLogic.update({
      where: { id: chatbotLogic.id },
      data: {
        triggers: triggersString,
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

    // Update chatbot logic
    await prisma.chatbotLogic.update({
      where: { id: chatbotLogic.id },
      data: {
        leadCollectionEnabled: false,
        leadCollectionConfig: undefined,
        triggers: JSON.stringify(triggers),
      },
    });

    // Also delete the chatbot form
    await prisma.chatbotForm.delete({
      where: { chatbotId }
    }).catch(error => {
      // Ignore error if form doesn't exist
      console.log('No form to delete:', error.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Lead collection disabled and form removed successfully',
    });

  } catch (error) {
    console.error('Error disabling lead collection:', error);
    return NextResponse.json(
      { error: 'Failed to disable lead collection' },
      { status: 500 }
    );
  }
}