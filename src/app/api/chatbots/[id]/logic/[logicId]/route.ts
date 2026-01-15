// app/api/chatbot/[id]/logic/[logicId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { LogicConfig } from '@/types/logic';
import prisma from '@/lib/prisma';

interface RouterParams {
  params: Promise<{ id: string; logicId: string }>;
}

// PUT endpoint to update logic
export async function PUT(
  request: NextRequest,
  context: RouterParams
) {
  try {
    const { id, logicId } = await context.params;
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

    // Update the Logic record
    const logic = await prisma.logic.update({
      where: { id: logicId },
      data: {
        name: body.name,
        description: body.description,
        triggerType: body.triggerType,
        keywords: body.keywords ? JSON.stringify(body.keywords) : null,
        showAlways: body.showAlways || false,
        showAtEnd: body.showAtEnd || false,
        showOnButton: body.showOnButton || false,
        isActive: body.isActive,
        position: body.position || 0,
        config: body as any,
      },
    })

    // Update type-specific records
    if (body.type === 'LINK_BUTTON' && body.linkButton) {
      await prisma.linkButton.upsert({
        where: { logicId },
        update: {
          buttonText: body.linkButton.buttonText,
          buttonIcon: body.linkButton.buttonIcon,
          buttonLink: body.linkButton.buttonLink,
          openInNewTab: body.linkButton.openInNewTab,
          buttonColor: body.linkButton.buttonColor,
          textColor: body.linkButton.textColor,
          buttonSize: body.linkButton.buttonSize,
        },
        create: {
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
      await prisma.meetingSchedule.upsert({
        where: { logicId },
        update: {
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
        create: {
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
      const leadCollection = await prisma.leadCollection.upsert({
        where: { logicId },
        update: {
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
        create: {
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

      // Delete existing form fields and recreate
      await prisma.formField.deleteMany({
        where: { leadCollectionId: leadCollection.id }
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

// DELETE endpoint to remove logic
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

    // Delete the Logic record (cascading delete will handle related records)
    await prisma.logic.delete({
      where: { id: logicId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Logic deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting logic:', error)
    return NextResponse.json(
      { error: 'Failed to delete logic configuration' },
      { status: 500 }
    )
  }
}