// app/api/chatbot/[id]/logic/[logicId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouterParams {
  params: Promise<{ id: string; logicId: string }>;
}

// PUT endpoint to update specific logic configuration fields
export async function PUT(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id, logicId } = await context.params;
    const body = await request.json()

    // Validate chatbot exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id }
    })

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found' },
        { status: 404 }
      )
    }

    // Validate that the logic belongs to this chatbot
    const existingLogic = await prisma.chatbotLogic.findFirst({
      where: {
        id: logicId,
        chatbotId: id
      }
    })

    if (!existingLogic) {
      return NextResponse.json(
        { error: 'Logic configuration not found for this chatbot' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    
    // Update specific feature configurations
    if (body.leadCollectionEnabled !== undefined) {
      updateData.leadCollectionEnabled = body.leadCollectionEnabled
    }
    if (body.leadCollectionConfig !== undefined) {
      // Make sure it's a string if it's not already
      updateData.leadCollectionConfig = typeof body.leadCollectionConfig === 'string' 
        ? body.leadCollectionConfig 
        : JSON.stringify(body.leadCollectionConfig)
    }
    
    if (body.linkButtonEnabled !== undefined) {
      updateData.linkButtonEnabled = body.linkButtonEnabled
    }
    if (body.linkButtonConfig !== undefined) {
      updateData.linkButtonConfig = typeof body.linkButtonConfig === 'string'
        ? body.linkButtonConfig
        : JSON.stringify(body.linkButtonConfig)
    }
    
    if (body.meetingScheduleEnabled !== undefined) {
      updateData.meetingScheduleEnabled = body.meetingScheduleEnabled
    }
    if (body.meetingScheduleConfig !== undefined) {
      updateData.meetingScheduleConfig = typeof body.meetingScheduleConfig === 'string'
        ? body.meetingScheduleConfig
        : JSON.stringify(body.meetingScheduleConfig)
    }
    
    if (body.triggers !== undefined) {
      updateData.triggers = typeof body.triggers === 'string'
        ? body.triggers
        : JSON.stringify(body.triggers)
    }

    // Update the logic configuration
    const logic = await prisma.chatbotLogic.update({
      where: { id: logicId },
      data: updateData,
    })

    // Parse JSON fields for response (safely)
    const parsedLogic = {
      ...logic,
      leadCollectionConfig: logic.leadCollectionConfig 
        ? (typeof logic.leadCollectionConfig === 'string' 
            ? JSON.parse(logic.leadCollectionConfig as string) 
            : logic.leadCollectionConfig)
        : null,
      linkButtonConfig: logic.linkButtonConfig
        ? (typeof logic.linkButtonConfig === 'string'
            ? JSON.parse(logic.linkButtonConfig as string)
            : logic.linkButtonConfig)
        : null,
      meetingScheduleConfig: logic.meetingScheduleConfig
        ? (typeof logic.meetingScheduleConfig === 'string'
            ? JSON.parse(logic.meetingScheduleConfig as string)
            : logic.meetingScheduleConfig)
        : null,
      triggers: logic.triggers
        ? (typeof logic.triggers === 'string'
            ? JSON.parse(logic.triggers as string)
            : logic.triggers)
        : null,
    }

    return NextResponse.json({ 
      success: true, 
      logic: parsedLogic,
      message: 'Logic configuration updated successfully'
    })

  } catch (error) {
    console.error('Error updating logic:', error)
    return NextResponse.json(
      { error: 'Failed to update logic configuration' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove specific logic configuration
export async function DELETE(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id, logicId } = await context.params;

    // Validate chatbot exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id }
    })

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found' },
        { status: 404 }
      )
    }

    // Validate that the logic belongs to this chatbot
    const existingLogic = await prisma.chatbotLogic.findFirst({
      where: {
        id: logicId,
        chatbotId: id
      }
    })

    if (!existingLogic) {
      return NextResponse.json(
        { error: 'Logic configuration not found for this chatbot' },
        { status: 404 }
      )
    }

    // Delete the logic configuration
    await prisma.chatbotLogic.delete({
      where: { id: logicId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Logic configuration deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting logic:', error)
    return NextResponse.json(
      { error: 'Failed to delete logic configuration' },
      { status: 500 }
    )
  }
}

// PATCH endpoint for partial updates to specific logic fields
export async function PATCH(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id, logicId } = await context.params;
    const body = await request.json()

    // Validate chatbot exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id }
    })

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found' },
        { status: 404 }
      )
    }

    // Validate that the logic belongs to this chatbot
    const existingLogic = await prisma.chatbotLogic.findFirst({
      where: {
        id: logicId,
        chatbotId: id
      }
    })

    if (!existingLogic) {
      return NextResponse.json(
        { error: 'Logic configuration not found for this chatbot' },
        { status: 404 }
      )
    }

    // Prepare update data - only update fields that are provided
    const updateData: any = {}

    // Handle specific feature toggles and configurations
    if (body.featureType === 'leadCollection') {
      if (body.enabled !== undefined) {
        updateData.leadCollectionEnabled = body.enabled
      }
      if (body.config !== undefined) {
        updateData.leadCollectionConfig = typeof body.config === 'string'
          ? body.config
          : JSON.stringify(body.config)
      }
    } else if (body.featureType === 'linkButton') {
      if (body.enabled !== undefined) {
        updateData.linkButtonEnabled = body.enabled
      }
      if (body.config !== undefined) {
        updateData.linkButtonConfig = typeof body.config === 'string'
          ? body.config
          : JSON.stringify(body.config)
      }
    } else if (body.featureType === 'meetingSchedule') {
      if (body.enabled !== undefined) {
        updateData.meetingScheduleEnabled = body.enabled
      }
      if (body.config !== undefined) {
        updateData.meetingScheduleConfig = typeof body.config === 'string'
          ? body.config
          : JSON.stringify(body.config)
      }
    } else if (body.triggers !== undefined) {
      updateData.triggers = typeof body.triggers === 'string'
        ? body.triggers
        : JSON.stringify(body.triggers)
    } else {
      // Handle generic updates
      if (body.name !== undefined) updateData.name = body.name
      if (body.description !== undefined) updateData.description = body.description
      if (body.isActive !== undefined) updateData.isActive = body.isActive
    }

    // Update the logic configuration
    const logic = await prisma.chatbotLogic.update({
      where: { id: logicId },
      data: updateData,
    })

    // Parse JSON fields for response (safely)
    const parsedLogic = {
      ...logic,
      leadCollectionConfig: logic.leadCollectionConfig
        ? (typeof logic.leadCollectionConfig === 'string'
            ? JSON.parse(logic.leadCollectionConfig as string)
            : logic.leadCollectionConfig)
        : null,
      linkButtonConfig: logic.linkButtonConfig
        ? (typeof logic.linkButtonConfig === 'string'
            ? JSON.parse(logic.linkButtonConfig as string)
            : logic.linkButtonConfig)
        : null,
      meetingScheduleConfig: logic.meetingScheduleConfig
        ? (typeof logic.meetingScheduleConfig === 'string'
            ? JSON.parse(logic.meetingScheduleConfig as string)
            : logic.meetingScheduleConfig)
        : null,
      triggers: logic.triggers
        ? (typeof logic.triggers === 'string'
            ? JSON.parse(logic.triggers as string)
            : logic.triggers)
        : null,
    }

    return NextResponse.json({ 
      success: true, 
      logic: parsedLogic,
      message: 'Logic configuration updated successfully'
    })

  } catch (error) {
    console.error('Error updating logic:', error)
    return NextResponse.json(
      { error: 'Failed to update logic configuration' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch specific logic configuration
export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id, logicId } = await context.params;
    
    // Validate that the logic belongs to this chatbot
    const logic = await prisma.chatbotLogic.findFirst({
      where: {
        id: logicId,
        chatbotId: id
      }
    })

    if (!logic) {
      return NextResponse.json(
        { error: 'Logic configuration not found' },
        { status: 404 }
      )
    }

    // Helper function to safely parse JSON fields
    const safelyParseJson = (field: any) => {
      if (!field) return null;
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

    // Parse JSON fields safely
    const parsedLogic = {
      ...logic,
      leadCollectionConfig: safelyParseJson(logic.leadCollectionConfig),
      linkButtonConfig: safelyParseJson(logic.linkButtonConfig),
      meetingScheduleConfig: safelyParseJson(logic.meetingScheduleConfig),
      triggers: safelyParseJson(logic.triggers),
    }

    return NextResponse.json({ logic: parsedLogic })

  } catch (error) {
    console.error('Error fetching logic:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logic configuration' },
      { status: 500 }
    )
  }
}