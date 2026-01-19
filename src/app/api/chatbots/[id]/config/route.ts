// app/api/chatbots/[chatbotId]/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouterParams {
  params: Promise<{id: string}>
}

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  try {
    // Get chatbot by ID
    const { id } = await context.params;

    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: id,
      },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  }
                }
              }
            }
          }
        },
        form: true,
        knowledgeBases: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        },
        logics: {
          where: {
            isActive: true,
          },
          include: {
            linkButton: true,
            meetingSchedule: true,
            leadCollection: {
              include: {
                formFields: {
                  orderBy: {
                    order: 'asc',
                  }
                }
              }
            }
          },
          orderBy: {
            position: 'asc',
          }
        }
      }
    });

    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found' },
        { status: 404 }
      );
    }

    // Parse suggestions if they exist
    let suggestions: string[] = [];
    if (chatbot.suggestions) {
      try {
        suggestions = Array.isArray(chatbot.suggestions) 
          ? chatbot.suggestions 
          : JSON.parse(chatbot.suggestions as string);
      } catch (error) {
        console.error('Error parsing suggestions:', error);
      }
    }

    // Format response
    const response = {
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description,
      greeting: chatbot.greeting,
      suggestions,
      theme: chatbot.theme,
      icon: chatbot.icon,
      iconShape: chatbot.iconShape,
      iconColor: chatbot.iconColor,
      iconBgColor: chatbot.iconBgColor,
      avatar: chatbot.avatar,
      avatarSize: chatbot.avatarSize,
      avatarColor: chatbot.avatarColor,
      avatarBgColor: chatbot.avatarBgColor,
      popup_onload: chatbot.popup_onload,
      directive: chatbot.directive,
      model: chatbot.model,
      max_tokens: chatbot.max_tokens,
      temperature: chatbot.temperature,
      createdAt: chatbot.createdAt,
      updatedAt: chatbot.updatedAt,
      
      // Workspace info
      workspace: {
        id: chatbot.workspace.id,
        name: chatbot.workspace.name,
      },
      
      // Lead form
      leadForm: chatbot.form ? {
        id: chatbot.form.id,
        title: chatbot.form.title,
        description: chatbot.form.description,
        fields: chatbot.form.fields,
        leadTiming: chatbot.form.leadTiming,
        leadFormStyle: chatbot.form.leadFormStyle,
      } : null,
      
      // Knowledge bases
      knowledgeBases: chatbot.knowledgeBases.map(kb => ({
        id: kb.id,
        name: kb.name,
        type: kb.type,
      })),
      
      // Active logics
      logics: chatbot.logics.map(logic => {
        const baseLogic = {
          id: logic.id,
          type: logic.type,
          name: logic.name,
          description: logic.description,
          triggerType: logic.triggerType,
          showAlways: logic.showAlways,
          showAtEnd: logic.showAtEnd,
          showOnButton: logic.showOnButton,
          position: logic.position,
        };

        // Add type-specific configurations
        switch (logic.type) {
          case 'LINK_BUTTON':
            return {
              ...baseLogic,
              buttonText: logic.linkButton?.buttonText,
              buttonIcon: logic.linkButton?.buttonIcon,
              buttonLink: logic.linkButton?.buttonLink,
              openInNewTab: logic.linkButton?.openInNewTab,
              buttonColor: logic.linkButton?.buttonColor,
              textColor: logic.linkButton?.textColor,
              buttonSize: logic.linkButton?.buttonSize,
            };
          
          case 'SCHEDULE_MEETING':
            return {
              ...baseLogic,
              calendarType: logic.meetingSchedule?.calendarType,
              calendarLink: logic.meetingSchedule?.calendarLink,
              calendarId: logic.meetingSchedule?.calendarId,
              duration: logic.meetingSchedule?.duration,
              timezone: logic.meetingSchedule?.timezone,
              titleFormat: logic.meetingSchedule?.titleFormat,
              description: logic.meetingSchedule?.description,
              showTimezoneSelector: logic.meetingSchedule?.showTimezoneSelector,
              requireConfirmation: logic.meetingSchedule?.requireConfirmation,
            };
          
          case 'COLLECT_LEADS':
            return {
              ...baseLogic,
              formTitle: logic.leadCollection?.formTitle,
              formDesc: logic.leadCollection?.formDesc,
              leadTiming: logic.leadCollection?.leadTiming,
              leadFormStyle: logic.leadCollection?.leadFormStyle,
              cadence: logic.leadCollection?.cadence,
              fields: logic.leadCollection?.fields,
              fieldOrder: logic.leadCollection?.fieldOrder,
              successMessage: logic.leadCollection?.successMessage,
              redirectUrl: logic.leadCollection?.redirectUrl,
              autoClose: logic.leadCollection?.autoClose,
              showThankYou: logic.leadCollection?.showThankYou,
              notifyEmail: logic.leadCollection?.notifyEmail,
              webhookUrl: logic.leadCollection?.webhookUrl,
              formFields: logic.leadCollection?.formFields || [],
            };
          
          default:
            return baseLogic;
        }
      }),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching chatbot config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbot configuration' },
      { status: 500 }
    );
  }
}