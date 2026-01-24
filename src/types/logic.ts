// types/logic.ts
export type LogicType = "COLLECT_LEADS" | "LINK_BUTTON" | "SCHEDULE_MEETING"
export type TriggerType = "KEYWORD" | "ALWAYS" | "MANUAL" | "END_OF_CONVERSATION"
export type FieldType = "TEXT" | "EMAIL" | "PHONE" | "NUMBER" | "CURRENCY" | "DATE" | "LINK"
export type LeadTiming = "BEGINNING" | "MIDDLE" | "END"
export type LeadFormStyle = "EMBEDDED" | "MESSAGES"
export type Cadence = "ALL_AT_ONCE" | "ONE_BY_ONE" | "GROUPED"
export type CalendarType = "CALENDLY" | "GOOGLE_CALENDAR" | "OUTLOOK_CALENDAR" | "CUSTOM"
export type ButtonSize = "SMALL" | "MEDIUM" | "LARGE"

export interface Field {
  id: string
  type: FieldType
  label: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  options?: string[]
}

export interface LogicConfig {
  id: string
  name: string
  description?: string
  type: LogicType
  triggerType: TriggerType
  keywords?: string[]
  showAlways?: boolean
  showAtEnd?: boolean
  showOnButton?: boolean
  isActive: boolean
  position?: number
  
  leadCollection?: {
    formTitle: string
    formDesc?: string
    leadTiming: LeadTiming
    leadFormStyle: LeadFormStyle
    cadence: Cadence
    fields: Field[]
    successMessage?: string
    redirectUrl?: string
    autoClose: boolean
    showThankYou: boolean
    notifyEmail?: string
    webhookUrl?: string
  }
  
  linkButton?: {
    buttonText: string
    buttonIcon?: string
    buttonLink: string
    openInNewTab: boolean
    buttonColor?: string
    textColor?: string
    buttonSize: ButtonSize
  }
  
  meetingSchedule?: {
    calendarType: CalendarType
    calendarLink: string
    calendarId?: string
    duration?: number
    timezone?: string
    titleFormat?: string
    description?: string
    availabilityDays?: number[]
    availabilityHours?: { start: string; end: string }
    bufferTime?: number
    showTimezoneSelector: boolean
    requireConfirmation: boolean
  }
}