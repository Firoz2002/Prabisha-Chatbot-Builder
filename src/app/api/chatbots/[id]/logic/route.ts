// app/api/chatbot/[id]/logic/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { LogicConfig } from '@/types/logic';
import { prisma } from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id } = await context.params;
    const body: LogicConfig = await request.json()

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

    // Create the Logic record
    const logic = await prisma.logic.create({
      data: {
        chatbotId: id,
        type: body.type,
        name: body.name,
        description: body.description,
        triggerType: body.triggerType,
        keywords: body.keywords,
        showAlways: body.showAlways || false,
        showAtEnd: body.showAtEnd || false,
        showOnButton: body.showOnButton || false,
        isActive: body.isActive,
        position: body.position || 0,
        config: body as any, // Store entire config for flexibility
      },
    })

    // Create type-specific records if needed
    if (body.type === 'LINK_BUTTON' && body.linkButton) {
      await prisma.linkButton.create({
        data: {
          logicId: logic.id,
          buttonText: body.linkButton.buttonText,
          buttonIcon: body.linkButton.buttonIcon,
          buttonLink: body.linkButton.buttonLink,
          openInNewTab: body.linkButton.openInNewTab,
          buttonColor: body.linkButton.buttonColor,
          textColor: body.linkButton.textColor,
          buttonSize: body.linkButton.buttonSize,
        },
      })
    }

    if (body.type === 'SCHEDULE_MEETING' && body.meetingSchedule) {
      await prisma.meetingSchedule.create({
        data: {
          logicId: logic.id,
          calendarType: body.meetingSchedule.calendarType,
          calendarLink: body.meetingSchedule.calendarLink,
          calendarId: body.meetingSchedule.calendarId,
          duration: body.meetingSchedule.duration,
          timezone: body.meetingSchedule.timezone,
          titleFormat: body.meetingSchedule.titleFormat,
          description: body.meetingSchedule.description,
          availabilityDays: body.meetingSchedule.availabilityDays 
            ? JSON.stringify(body.meetingSchedule.availabilityDays)
            : null,
          availabilityHours: body.meetingSchedule.availabilityHours
            ? JSON.stringify(body.meetingSchedule.availabilityHours)
            : null,
          bufferTime: body.meetingSchedule.bufferTime,
          showTimezoneSelector: body.meetingSchedule.showTimezoneSelector,
          requireConfirmation: body.meetingSchedule.requireConfirmation,
        },
      })
    }

    if (body.type === 'COLLECT_LEADS' && body.leadCollection) {
      const leadCollection = await prisma.leadCollection.create({
        data: {
          logicId: logic.id,
          formTitle: body.leadCollection.formTitle,
          formDesc: body.leadCollection.formDesc,
          leadTiming: body.leadCollection.leadTiming,
          leadFormStyle: body.leadCollection.leadFormStyle,
          cadence: body.leadCollection.cadence,
          fields: JSON.stringify(body.leadCollection.fields),
          successMessage: body.leadCollection.successMessage,
          redirectUrl: body.leadCollection.redirectUrl,
          autoClose: body.leadCollection.autoClose,
          showThankYou: body.leadCollection.showThankYou,
          notifyEmail: body.leadCollection.notifyEmail,
          webhookUrl: body.leadCollection.webhookUrl,
        },
      })

      // Create form fields if needed
      if (body.leadCollection.fields && body.leadCollection.fields.length > 0) {
        await prisma.formField.createMany({
          data: body.leadCollection.fields.map((field, index) => ({
            leadCollectionId: leadCollection.id,
            type: field.type,
            label: field.label,
            required: field.required || false,
            placeholder: field.placeholder,
            defaultValue: field.defaultValue,
            validationRules: field.options ? JSON.stringify(field.options) : null,
            order: index,
          })),
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      logic,
      message: 'Logic configuration saved successfully'
    })

  } catch (error) {
    console.error('Error saving logic:', error)
    return NextResponse.json(
      { error: 'Failed to save logic configuration' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch existing logics
export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id } = await context.params;
    
    const logics = await prisma.logic.findMany({
      where: { chatbotId: id },
      include: {
        linkButton: true,
        meetingSchedule: true,
        leadCollection: {
          include: {
            formFields: true
          }
        }
      },
      orderBy: { position: 'asc' }
    })

    return NextResponse.json({ logics })

  } catch (error) {
    console.error('Error fetching logics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logic configurations' },
      { status: 500 }
    )
  }
}