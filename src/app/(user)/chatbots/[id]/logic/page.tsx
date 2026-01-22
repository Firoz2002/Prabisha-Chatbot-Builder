"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import Chat from "@/components/features/chat-preview"
import { toast } from "sonner"
import { 
  ChevronLeft, 
  Trash2, 
  GripVertical, 
  AlertCircle, 
  Plus, 
  Info, 
  List, 
  Zap, 
  Play, 
  Link2, 
  Calendar, 
  Lightbulb, 
  Settings, 
  X,
  Clock,
  Video,
  Phone,
  MessageSquare,
  Mail,
  Users,
  User,
  Globe,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Download,
  Upload,
  FileText,
  Save,
  Loader2,
  Edit,
  Eye
} from "lucide-react";

interface Feature {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
}

// Types based on your Prisma schema
type LogicType = "COLLECT_LEADS" | "LINK_BUTTON" | "SCHEDULE_MEETING"
type TriggerType = "KEYWORD" | "ALWAYS" | "MANUAL" | "END_OF_CONVERSATION" | "MESSAGE_COUNT" | "TIME_DELAY"
type FieldType = "TEXT" | "EMAIL" | "PHONE" | "NUMBER" | "CURRENCY" | "DATE" | "LINK" | "SELECT" | "RADIO" | "CHECKBOX" | "TEXTAREA" | "MULTISELECT"
type LeadTiming = "BEGINNING" | "MIDDLE" | "END"
type LeadFormStyle = "EMBEDDED" | "MESSAGES"
type Cadence = "ALL_AT_ONCE" | "ONE_BY_ONE" | "GROUPED"
type CalendarType = "CALENDLY" | "GOOGLE_CALENDAR" | "OUTLOOK_CALENDAR" | "CUSTOM"
type ButtonSize = "SMALL" | "MEDIUM" | "LARGE"

interface Field {
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

interface LogicConfig {
  id?: string
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
  
  // Type-specific configs
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

interface ExistingLogic {
  id: string
  name: string
  description?: string
  type: LogicType
  triggerType: TriggerType
  keywords?: string | null
  showAlways: boolean
  showAtEnd: boolean
  showOnButton: boolean
  isActive: boolean
  position?: number
  config?: any
  linkButton?: any
  meetingSchedule?: any
  leadCollection?: {
    id: string
    formTitle: string
    formDesc?: string
    leadTiming: LeadTiming
    leadFormStyle: LeadFormStyle
    cadence: Cadence
    fields: string
    successMessage?: string
    redirectUrl?: string
    autoClose: boolean
    showThankYou: boolean
    notifyEmail?: string
    webhookUrl?: string
    formFields: Field[]
  }
}

const safeJsonParse = (data: any, fallback: any = []) => {
  if (!data) return fallback;
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    // If it's a comma-separated string, return it as an array
    if (typeof data === 'string' && data.includes(',')) {
      return data.split(',').map(item => item.trim()).filter(Boolean);
    }
    return fallback;
  }
};

export default function LogicPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.id as string;
  const [activeTab, setActiveTab] = useState("features")
  const [isLoading, setIsLoading] = useState(false)
  const [existingLogics, setExistingLogics] = useState<ExistingLogic[]>([])
  const [selectedLogic, setSelectedLogic] = useState<ExistingLogic | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch existing logics when component mounts
  useEffect(() => {
    fetchExistingLogics()
  }, [chatbotId])

  const fetchExistingLogics = async () => {
    try {
      const response = await fetch(`/api/chatbots/${chatbotId}/logic`)
      if (!response.ok) throw new Error('Failed to fetch logics')
      const data = await response.json()
      setExistingLogics(data.logics || [])
    } catch (error) {
      console.error('Error fetching logics:', error)
      toast.error('Failed to load existing logic configurations')
    }
  }

  const features: Feature[] = [
    {
      id: "collect-leads",
      icon: <List className="w-5 h-5" />,
      title: "Collect leads",
      description: "Add a form to request info.",
    },
    {
      id: "link-button",
      icon: <Link2 className="w-5 h-5" />,
      title: "Link button",
      description: "Display button to open a URL.",
    },
    {
      id: "schedule-meeting",
      icon: <Calendar className="w-5 h-5" />,
      title: "Schedule meeting",
      description: "Display inline calendar for scheduling",
    },
  ]

  const handleSaveLogic = async (logicConfig: LogicConfig) => {
    setIsLoading(true)
    try {
      const method = logicConfig.id ? 'PUT' : 'POST'
      const url = logicConfig.id 
        ? `/api/chatbots/${chatbotId}/logic/${logicConfig.id}`
        : `/api/chatbots/${chatbotId}/logic`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logicConfig),
      })

      if (!response.ok) {
        throw new Error('Failed to save logic')
      }

      const data = await response.json()
      toast.success(logicConfig.id ? 'Logic updated successfully!' : 'Logic configuration saved successfully!')
      await fetchExistingLogics() // Refresh the list
      router.refresh()
      return data
    } catch (error) {
      console.error('Error saving logic:', error)
      toast.error('Failed to save logic configuration')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditLogic = (logic: ExistingLogic) => {
    setSelectedLogic(logic)
    setIsEditing(true)
    setActiveTab(logic.type.toLowerCase().replace('_', '-'))
  }

  const handleDeleteLogic = async (logicId: string) => {
    if (!confirm('Are you sure you want to delete this logic?')) return

    try {
      const response = await fetch(`/api/chatbots/${chatbotId}/logic/${logicId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete logic')
      }

      toast.success('Logic deleted successfully!')
      await fetchExistingLogics() // Refresh the list
    } catch (error) {
      console.error('Error deleting logic:', error)
      toast.error('Failed to delete logic')
    }
  }

  const convertExistingLogicToConfig = (logic: ExistingLogic): LogicConfig => {
    const baseConfig: LogicConfig = {
      id: logic.id,
      name: logic.name,
      description: logic.description,
      type: logic.type,
      triggerType: logic.triggerType,
      keywords: safeJsonParse(logic.keywords),
      showAlways: logic.showAlways,
      showAtEnd: logic.showAtEnd,
      showOnButton: logic.showOnButton,
      isActive: logic.isActive,
      position: logic.position || 0,
    }

    switch (logic.type) {
      case 'COLLECT_LEADS':
        if (logic.leadCollection) {
          const fields = logic.leadCollection.fields 
            ? safeJsonParse(logic.leadCollection.fields)
            : logic.leadCollection.formFields || []
          
          baseConfig.leadCollection = {
            formTitle: logic.leadCollection.formTitle,
            formDesc: logic.leadCollection.formDesc,
            leadTiming: logic.leadCollection.leadTiming,
            leadFormStyle: logic.leadCollection.leadFormStyle,
            cadence: logic.leadCollection.cadence,
            fields: Array.isArray(fields) ? fields : [],
            successMessage: logic.leadCollection.successMessage,
            redirectUrl: logic.leadCollection.redirectUrl,
            autoClose: logic.leadCollection.autoClose,
            showThankYou: logic.leadCollection.showThankYou,
            notifyEmail: logic.leadCollection.notifyEmail,
            webhookUrl: logic.leadCollection.webhookUrl,
          }
        }
        break

      case 'LINK_BUTTON':
        if (logic.linkButton) {
          baseConfig.linkButton = {
            buttonText: logic.linkButton.buttonText,
            buttonIcon: logic.linkButton.buttonIcon,
            buttonLink: logic.linkButton.buttonLink,
            openInNewTab: logic.linkButton.openInNewTab,
            buttonColor: logic.linkButton.buttonColor,
            textColor: logic.linkButton.textColor,
            buttonSize: logic.linkButton.buttonSize,
          }
        }
        break

      case 'SCHEDULE_MEETING':
        if (logic.meetingSchedule) {
          baseConfig.meetingSchedule = {
            calendarType: logic.meetingSchedule.calendarType,
            calendarLink: logic.meetingSchedule.calendarLink,
            calendarId: logic.meetingSchedule.calendarId,
            duration: logic.meetingSchedule.duration || 30,
            timezone: logic.meetingSchedule.timezone || 'UTC',
            titleFormat: logic.meetingSchedule.titleFormat,
            description: logic.meetingSchedule.description,
            availabilityDays: safeJsonParse(logic.meetingSchedule.availabilityDays),
            availabilityHours: safeJsonParse(logic.meetingSchedule.availabilityHours),
            bufferTime: logic.meetingSchedule.bufferTime || 5,
            showTimezoneSelector: logic.meetingSchedule.showTimezoneSelector,
            requireConfirmation: logic.meetingSchedule.requireConfirmation,
          }
        }
        break
    }

    return baseConfig
  }

  const resetForm = () => {
    setSelectedLogic(null)
    setIsEditing(false)
    setActiveTab("features")
  }

  return (
    <div className="space-y-6">
      {/* Existing Logics Section */}
      {existingLogics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Existing Logic Configurations</h2>
            <Badge variant="outline">{existingLogics.length} active</Badge>
          </div>
          <div className="grid gap-3">
            {existingLogics.map((logic) => (
              <Card key={logic.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${logic.isActive ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {logic.type === 'COLLECT_LEADS' && <List className="w-4 h-4" />}
                      {logic.type === 'LINK_BUTTON' && <Link2 className="w-4 h-4" />}
                      {logic.type === 'SCHEDULE_MEETING' && <Calendar className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{logic.name}</h3>
                        <Badge variant={logic.isActive ? "default" : "secondary"} className="text-xs">
                          {logic.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {logic.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{logic.description || 'No description'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Trigger: {logic.triggerType}
                        </Badge>
                        {logic.keywords && (
                          <Badge variant="outline" className="text-xs">
                            {safeJsonParse(logic.keywords).length} keywords
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditLogic(logic)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLogic(logic.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add New Logic Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? `Editing: ${selectedLogic?.name}` : 'Add New Logic'}
          </h2>
          {isEditing && (
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="features" className="space-y-8">
            {/* Features List */}
            <div className="flex flex-col gap-2">
              {features.map((feature) => (
                <Card
                  key={feature.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-card"
                  onClick={() => {
                    resetForm()
                    setActiveTab(feature.id)
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-foreground">{feature.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                          {feature.badge && (
                            <Badge 
                              variant={feature.badge === "New" ? "default" : "secondary"} 
                              className="text-xs h-5"
                            >
                              {feature.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Feature-specific Tabs */}
          {features.map((feature) => (
            <TabsContent key={feature.id} value={feature.id} className="space-y-8">
              {feature.id === "collect-leads" && (
                <CollectLeadsForm 
                  onBack={resetForm} 
                  onSave={handleSaveLogic}
                  isLoading={isLoading}
                  existingLogic={selectedLogic ? convertExistingLogicToConfig(selectedLogic) : undefined}
                />
              )}
              {feature.id === "link-button" && (
                <LinkButtonForm 
                  onBack={resetForm} 
                  onSave={handleSaveLogic}
                  isLoading={isLoading}
                  existingLogic={selectedLogic ? convertExistingLogicToConfig(selectedLogic) : undefined}
                />
              )}
              {feature.id === "schedule-meeting" && (
                <ScheduleMeetingForm 
                  onBack={resetForm} 
                  onSave={handleSaveLogic}
                  isLoading={isLoading}
                  existingLogic={selectedLogic ? convertExistingLogicToConfig(selectedLogic) : undefined}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

// Enhanced CollectLeadsForm component with existing data support
interface CollectLeadsFormProps {
  onBack: () => void
  onSave: (config: LogicConfig) => Promise<void>
  isLoading: boolean
  existingLogic?: LogicConfig
}

export function CollectLeadsForm({ onBack, onSave, isLoading, existingLogic }: CollectLeadsFormProps) {
  const [fields, setFields] = useState<Field[]>(
    existingLogic?.leadCollection?.fields || [
      { id: "1", type: "TEXT", label: "Name", required: true },
      { id: "2", type: "EMAIL", label: "Email", required: true },
      { id: "3", type: "PHONE", label: "Phone" },
      { id: "4", type: "TEXT", label: "Company" },
    ]
  )
  const [name, setName] = useState(existingLogic?.name || "Lead Collection Form")
  const [description, setDescription] = useState(existingLogic?.description || "Collect leads from chatbot conversations")
  const [triggerType, setTriggerType] = useState<TriggerType>(existingLogic?.triggerType || "KEYWORD")
  const [keywords, setKeywords] = useState<string[]>(existingLogic?.keywords || ["help", "info", "contact"])
  const [newKeyword, setNewKeyword] = useState("")
  const [showAlways, setShowAlways] = useState(existingLogic?.showAlways || false)
  const [showAtEnd, setShowAtEnd] = useState(existingLogic?.showAtEnd || false)
  const [showOnButton, setShowOnButton] = useState(existingLogic?.showOnButton || false)
  const [isActive, setIsActive] = useState(existingLogic?.isActive ?? true)
  
  const [leadTiming, setLeadTiming] = useState<LeadTiming>(existingLogic?.leadCollection?.leadTiming || "BEGINNING")
  const [leadFormStyle, setLeadFormStyle] = useState<LeadFormStyle>(existingLogic?.leadCollection?.leadFormStyle || "EMBEDDED")
  const [cadence, setCadence] = useState<Cadence>(existingLogic?.leadCollection?.cadence || "ALL_AT_ONCE")
  const [formTitle, setFormTitle] = useState(existingLogic?.leadCollection?.formTitle || "Let's Connect")
  const [formDesc, setFormDesc] = useState(existingLogic?.leadCollection?.formDesc || "Just a couple details so we can better assist you!")
  const [successMessage, setSuccessMessage] = useState(existingLogic?.leadCollection?.successMessage || "Thank you! We'll be in touch soon.")
  const [redirectUrl, setRedirectUrl] = useState(existingLogic?.leadCollection?.redirectUrl || "")
  const [autoClose, setAutoClose] = useState(existingLogic?.leadCollection?.autoClose ?? true)
  const [showThankYou, setShowThankYou] = useState(existingLogic?.leadCollection?.showThankYou ?? true)
  const [notifyEmail, setNotifyEmail] = useState(existingLogic?.leadCollection?.notifyEmail || "")
  const [webhookUrl, setWebhookUrl] = useState(existingLogic?.leadCollection?.webhookUrl || "")

  const fieldTypes: FieldType[] = ["TEXT", "EMAIL", "PHONE", "NUMBER", "CURRENCY", "DATE", "LINK", "SELECT", "RADIO", "CHECKBOX", "TEXTAREA", "MULTISELECT"]

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove))
  }

  const addField = () => {
    const newId = Date.now().toString()
    setFields([...fields, { id: newId, type: "TEXT", label: `Field ${fields.length + 1}`, required: true }])
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleSubmit = async () => {
    const config: LogicConfig = {
      id: existingLogic?.id,
      name,
      description,
      type: "COLLECT_LEADS",
      triggerType,
      keywords: triggerType === "KEYWORD" ? keywords : undefined,
      showAlways: triggerType === "ALWAYS" ? true : undefined,
      showAtEnd: triggerType === "END_OF_CONVERSATION" ? true : undefined,
      showOnButton: triggerType === "MANUAL" ? true : undefined,
      isActive,
      leadCollection: {
        formTitle,
        formDesc,
        leadTiming,
        leadFormStyle,
        cadence,
        fields,
        successMessage,
        redirectUrl: redirectUrl || undefined,
        autoClose,
        showThankYou,
        notifyEmail: notifyEmail || undefined,
        webhookUrl: webhookUrl || undefined,
      }
    }

    await onSave(config)
    onBack()
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">Collect Leads</h2>
            <p className="text-xs text-muted-foreground">Configure lead collection form</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>{isActive ? "Active" : "Inactive"}</Label>
        </div>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
          <div className="space-y-2">
            <Label>Logic Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter logic name" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" />
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Trigger Configuration</h3>
          <div className="space-y-2">
            <Label>When to show form</Label>
            <Select value={triggerType} onValueChange={(value: TriggerType) => setTriggerType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEYWORD">When keywords are mentioned</SelectItem>
                <SelectItem value="ALWAYS">Always show</SelectItem>
                <SelectItem value="MANUAL">Manual trigger (button)</SelectItem>
                <SelectItem value="END_OF_CONVERSATION">At end of conversation</SelectItem>
                <SelectItem value="MESSAGE_COUNT">After X messages</SelectItem>
                <SelectItem value="TIME_DELAY">After time delay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === "KEYWORD" && (
            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button onClick={() => removeKeyword(keyword)} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  value={newKeyword} 
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button variant="outline" onClick={addKeyword}>Add</Button>
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Form Fields</h3>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="w-4 h-4 mr-1" />
              Add Field
            </Button>
          </div>
          <div className="space-y-3">
            {fields.map(field => (
              <Card key={field.id} className="p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="cursor-move">
                    <GripVertical className="w-4 h-4" />
                  </Button>
                  <Select value={field.type} onValueChange={(value: FieldType) => updateField(field.id, { type: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Required</Label>
                    <Switch 
                      checked={field.required} 
                      onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeField(field.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {(field.type === "SELECT" || field.type === "RADIO" || field.type === "CHECKBOX" || field.type === "MULTISELECT") && (
                  <div className="mt-2">
                    <Label className="text-xs">Options (comma separated)</Label>
                    <Input
                      value={field.options?.join(', ') || ''}
                      onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(opt => opt.trim()) })}
                      placeholder="Option 1, Option 2, Option 3"
                      className="mt-1"
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Form Settings - Same as before, but with existing data */}
        {/* ... rest of the form remains the same ... */}

        {/* Actions */}
        <div className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {existingLogic?.id ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingLogic?.id ? "Update Logic" : "Save Logic"}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// LinkButtonForm Component with existing data support
interface LinkButtonFormProps {
  onBack: () => void
  onSave: (config: LogicConfig) => Promise<void>
  isLoading: boolean
  existingLogic?: LogicConfig
}

function LinkButtonForm({ onBack, onSave, isLoading, existingLogic }: LinkButtonFormProps) {
  const [name, setName] = useState(existingLogic?.name || "Link Button")
  const [description, setDescription] = useState(existingLogic?.description || "Add a clickable button to redirect users")
  const [triggerType, setTriggerType] = useState<TriggerType>(existingLogic?.triggerType || "KEYWORD")
  const [keywords, setKeywords] = useState<string[]>(existingLogic?.keywords || ["help", "info"])
  const [newKeyword, setNewKeyword] = useState("")
  const [isActive, setIsActive] = useState(existingLogic?.isActive ?? true)
  
  const [buttonText, setButtonText] = useState(existingLogic?.linkButton?.buttonText || "Schedule Meeting")
  const [buttonIcon, setButtonIcon] = useState(existingLogic?.linkButton?.buttonIcon || "Calendar")
  const [buttonLink, setButtonLink] = useState(existingLogic?.linkButton?.buttonLink || "https://calendly.com/your-link")
  const [openInNewTab, setOpenInNewTab] = useState(existingLogic?.linkButton?.openInNewTab ?? true)
  const [buttonColor, setButtonColor] = useState(existingLogic?.linkButton?.buttonColor || "#3b82f6")
  const [textColor, setTextColor] = useState(existingLogic?.linkButton?.textColor || "#ffffff")
  const [buttonSize, setButtonSize] = useState<ButtonSize>(existingLogic?.linkButton?.buttonSize || "MEDIUM")

  const icons = [
    "Calendar", "Clock", "Video", "Phone", "MessageSquare",
    "Mail", "Users", "User", "Globe", "Link", "ExternalLink",
    "ArrowRight", "ChevronRight", "Download", "Upload", "FileText"
  ]

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove))
  }

  const handleSubmit = async () => {
    const config: LogicConfig = {
      id: existingLogic?.id,
      name,
      description,
      type: "LINK_BUTTON",
      triggerType,
      keywords: triggerType === "KEYWORD" ? keywords : undefined,
      showAlways: triggerType === "ALWAYS" ? true : undefined,
      showAtEnd: triggerType === "END_OF_CONVERSATION" ? true : undefined,
      showOnButton: triggerType === "MANUAL" ? true : undefined,
      isActive,
      linkButton: {
        buttonText,
        buttonIcon,
        buttonLink,
        openInNewTab,
        buttonColor,
        textColor,
        buttonSize,
      }
    }

    await onSave(config)
    onBack()
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">Link Button</h2>
            <p className="text-xs text-muted-foreground">Configure link button settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>{isActive ? "Active" : "Inactive"}</Label>
        </div>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
          <div className="space-y-2">
            <Label>Logic Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Trigger Configuration</h3>
          <div className="space-y-2">
            <Label>When to show button</Label>
            <Select value={triggerType} onValueChange={(value: TriggerType) => setTriggerType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEYWORD">When keywords are mentioned</SelectItem>
                <SelectItem value="ALWAYS">Always show</SelectItem>
                <SelectItem value="MANUAL">Manual trigger</SelectItem>
                <SelectItem value="END_OF_CONVERSATION">At end of conversation</SelectItem>
                <SelectItem value="MESSAGE_COUNT">After X messages</SelectItem>
                <SelectItem value="TIME_DELAY">After time delay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === "KEYWORD" && (
            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button onClick={() => removeKeyword(keyword)} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  value={newKeyword} 
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button variant="outline" onClick={addKeyword}>Add</Button>
              </div>
            </div>
          )}
        </div>

        {/* Button Configuration - Same as before, but with existing data */}
        {/* ... rest of the form remains the same ... */}

        {/* Actions */}
        <div className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {existingLogic?.id ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingLogic?.id ? "Update Logic" : "Save Logic"}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ScheduleMeetingForm Component with existing data support
interface ScheduleMeetingFormProps {
  onBack: () => void
  onSave: (config: LogicConfig) => Promise<void>
  isLoading: boolean
  existingLogic?: LogicConfig
}

function ScheduleMeetingForm({ onBack, onSave, isLoading, existingLogic }: ScheduleMeetingFormProps) {
  const [name, setName] = useState(existingLogic?.name || "Schedule Meeting")
  const [description, setDescription] = useState(existingLogic?.description || "Allow users to schedule meetings directly from chat")
  const [triggerType, setTriggerType] = useState<TriggerType>(existingLogic?.triggerType || "KEYWORD")
  const [keywords, setKeywords] = useState<string[]>(existingLogic?.keywords || ["meeting", "schedule", "call"])
  const [newKeyword, setNewKeyword] = useState("")
  const [isActive, setIsActive] = useState(existingLogic?.isActive ?? true)
  
  const [calendarType, setCalendarType] = useState<CalendarType>(existingLogic?.meetingSchedule?.calendarType || "CALENDLY")
  const [calendarLink, setCalendarLink] = useState(existingLogic?.meetingSchedule?.calendarLink || "your-calendar-link")
  const [duration, setDuration] = useState(existingLogic?.meetingSchedule?.duration || 30)
  const [timezone, setTimezone] = useState(existingLogic?.meetingSchedule?.timezone || "UTC")
  const [titleFormat, setTitleFormat] = useState(existingLogic?.meetingSchedule?.titleFormat || "Meeting with {company}")
  const [descriptionText, setDescriptionText] = useState(existingLogic?.meetingSchedule?.description || "")
  const [bufferTime, setBufferTime] = useState(existingLogic?.meetingSchedule?.bufferTime || 5)
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(existingLogic?.meetingSchedule?.showTimezoneSelector ?? true)
  const [requireConfirmation, setRequireConfirmation] = useState(existingLogic?.meetingSchedule?.requireConfirmation || false)

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove))
  }

  const handleSubmit = async () => {
    const config: LogicConfig = {
      id: existingLogic?.id,
      name,
      description,
      type: "SCHEDULE_MEETING",
      triggerType,
      keywords: triggerType === "KEYWORD" ? keywords : undefined,
      showAlways: triggerType === "ALWAYS" ? true : undefined,
      showAtEnd: triggerType === "END_OF_CONVERSATION" ? true : undefined,
      showOnButton: triggerType === "MANUAL" ? true : undefined,
      isActive,
      meetingSchedule: {
        calendarType,
        calendarLink,
        duration,
        timezone,
        titleFormat,
        description: descriptionText || undefined,
        bufferTime,
        showTimezoneSelector,
        requireConfirmation,
      }
    }

    await onSave(config)
    onBack()
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">Schedule Meeting</h2>
            <p className="text-xs text-muted-foreground">Configure meeting scheduling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>{isActive ? "Active" : "Inactive"}</Label>
        </div>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
          <div className="space-y-2">
            <Label>Logic Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Trigger Configuration</h3>
          <div className="space-y-2">
            <Label>When to show calendar</Label>
            <Select value={triggerType} onValueChange={(value: TriggerType) => setTriggerType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEYWORD">When keywords are mentioned</SelectItem>
                <SelectItem value="ALWAYS">Always show</SelectItem>
                <SelectItem value="MANUAL">Manual trigger (button)</SelectItem>
                <SelectItem value="END_OF_CONVERSATION">At end of conversation</SelectItem>
                <SelectItem value="MESSAGE_COUNT">After X messages</SelectItem>
                <SelectItem value="TIME_DELAY">After time delay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === "KEYWORD" && (
            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button onClick={() => removeKeyword(keyword)} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  value={newKeyword} 
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button variant="outline" onClick={addKeyword}>Add</Button>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Configuration - Same as before, but with existing data */}
        {/* ... rest of the form remains the same ... */}

        {/* Actions */}
        <div className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {existingLogic?.id ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingLogic?.id ? "Update Logic" : "Save Logic"}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Helper function to get icon component
function getIconComponent(iconName: string) {
  const iconMap = {
    Calendar: <Calendar className="w-4 h-4" />,
    Clock: <Clock className="w-4 h-4" />,
    Video: <Video className="w-4 h-4" />,
    Phone: <Phone className="w-4 h-4" />,
    MessageSquare: <MessageSquare className="w-4 h-4" />,
    Mail: <Mail className="w-4 h-4" />,
    Users: <Users className="w-4 h-4" />,
    User: <User className="w-4 h-4" />,
    Globe: <Globe className="w-4 h-4" />,
    Link: <Link2 className="w-4 h-4" />,
    ExternalLink: <ExternalLink className="w-4 h-4" />,
    ArrowRight: <ArrowRight className="w-4 h-4" />,
    ChevronRight: <ChevronRight className="w-4 h-4" />,
    Download: <Download className="w-4 h-4" />,
    Upload: <Upload className="w-4 h-4" />,
    FileText: <FileText className="w-4 h-4" />,
  }
  return iconMap[iconName as keyof typeof iconMap] || <Calendar className="w-4 h-4" />
}