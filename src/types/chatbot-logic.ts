// src/types/chatbot-logic.ts

// Field Types
export type FieldType = "TEXT" | "EMAIL" | "PHONE" | "NUMBER" | "CURRENCY" | "DATE" | "LINK" | "SELECT" | "RADIO" | "CHECKBOX" | "TEXTAREA" | "MULTISELECT"

// Form Field
export interface FormField {
  id: string
  type: FieldType
  label: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  options?: string[]
  validationRules?: string
  order?: number
}

// Form Configuration
export type LeadTiming = "BEGINNING" | "MIDDLE" | "END"
export type LeadFormStyle = "EMBEDDED" | "MESSAGES"
export type Cadence = "ALL_AT_ONCE" | "ONE_BY_ONE" | "GROUPED"

export interface FormConfig {
  title?: string
  description?: string
  fields: FormField[]
  leadTiming?: LeadTiming
  leadFormStyle?: LeadFormStyle
  cadence?: Cadence
  successMessage?: string
  redirectUrl?: string
  autoClose?: boolean
  showThankYou?: boolean
  notifyEmail?: string
  webhookUrl?: string
}

// Link Button Configuration
export type ButtonSize = "SMALL" | "MEDIUM" | "LARGE"

export interface LinkButtonConfig {
  enabled?: boolean
  buttonText: string
  buttonIcon?: string
  buttonLink: string
  openInNewTab?: boolean
  buttonColor?: string
  textColor?: string
  buttonSize?: ButtonSize
  trigger?: TriggerConfig
}

// Meeting Schedule Configuration
export type CalendarType = "CALENDLY" | "GOOGLE_CALENDAR" | "OUTLOOK_CALENDAR" | "CUSTOM"

export interface MeetingScheduleConfig {
  enabled?: boolean
  calendarType: CalendarType
  calendarLink: string
  calendarId?: string
  duration?: number
  timezone?: string
  titleFormat?: string
  description?: string
  availabilityDays?: number[] // 0-6 for Sunday-Saturday
  availabilityHours?: {
    start: string // "09:00"
    end: string   // "17:00"
  }
  bufferTime?: number
  showTimezoneSelector?: boolean
  requireConfirmation?: boolean
  trigger?: TriggerConfig
}

// Lead Collection Configuration
export interface LeadCollectionConfig {
  enabled?: boolean
  formTitle?: string
  formDesc?: string
  leadTiming?: LeadTiming
  leadFormStyle?: LeadFormStyle
  cadence?: Cadence
  fields?: FormField[]
  successMessage?: string
  redirectUrl?: string
  autoClose?: boolean
  showThankYou?: boolean
  notifyEmail?: string
  webhookUrl?: string
  trigger?: TriggerConfig
}

// Trigger Configuration
export type TriggerType = "KEYWORD" | "ALWAYS" | "MANUAL" | "END_OF_CONVERSATION" | "MESSAGE_COUNT" | "TIME_DELAY"

export interface TriggerConfig {
  type: TriggerType
  keywords?: string[]
  messageCount?: number
  timeDelay?: number // in seconds
  showOnButton?: boolean
  position?: number
}

// Chatbot Logic - Main consolidated type
export interface ChatbotLogic {
  id?: string
  chatbotId: string
  name?: string
  description?: string
  isActive?: boolean
  
  // Lead Collection Configuration
  leadCollectionEnabled?: boolean
  leadCollectionConfig?: LeadCollectionConfig
  
  // Link Button Configuration
  linkButtonEnabled?: boolean
  linkButtonConfig?: LinkButtonConfig
  
  // Meeting Schedule Configuration
  meetingScheduleEnabled?: boolean
  meetingScheduleConfig?: MeetingScheduleConfig
  
  // Array of triggers (each feature can have its own trigger)
  triggers?: TriggerConfig[]
  
  // Creation/Update timestamps
  createdAt?: Date
  updatedAt?: Date
}

// Chatbot Form - Separate from logic
export interface ChatbotForm {
  id?: string
  chatbotId: string
  title?: string
  description?: string
  fields: FormField[]
  leadTiming?: LeadTiming
  leadFormStyle?: LeadFormStyle
  cadence?: Cadence
  successMessage?: string
  redirectUrl?: string
  autoClose?: boolean
  showThankYou?: boolean
  notifyEmail?: string
  webhookUrl?: string
  createdAt?: Date
  updatedAt?: Date
}