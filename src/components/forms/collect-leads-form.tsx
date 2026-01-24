import { useState } from "react"
import { ChevronLeft, Trash2, GripVertical, Plus, X, Save, Loader2, } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/ui/select"

// Import types from your types file
import type { 
  ChatbotLogic, 
  LeadCollectionConfig, 
  TriggerConfig, 
  TriggerType,
  FieldType,
  FormField,
  LeadTiming,
  LeadFormStyle,
  Cadence
} from "@/types/chatbot-logic"

interface CollectLeadsFormProps {
  onBack: () => void
  onSave: (logic: Partial<ChatbotLogic>, form?: Partial<any>) => Promise<void>
  isLoading: boolean
  initial?: {
    logic?: ChatbotLogic
    form?: any
  }
}

export function CollectLeadsForm({ onBack, onSave, isLoading, initial }: CollectLeadsFormProps) {
  // Get initial values from existing logic or use defaults
  const logic = initial?.logic
  const form = initial?.form
  
  // Logic settings
  const [name, setName] = useState(logic?.name || "Lead Collection Form")
  const [description, setDescription] = useState(logic?.description || "Collect leads from chatbot conversations")
  const [isActive, setIsActive] = useState(logic?.isActive ?? true)
  const [leadCollectionEnabled, setLeadCollectionEnabled] = useState(logic?.leadCollectionEnabled ?? true)
  
  // Form settings (can come from form or logic)
  const [formTitle, setFormTitle] = useState(
    form?.title || 
    logic?.leadCollectionConfig?.formTitle || 
    "Let's Connect"
  )
  const [formDesc, setFormDesc] = useState(
    form?.description || 
    logic?.leadCollectionConfig?.formDesc || 
    "Just a couple details so we can better assist you!"
  )
  const [leadTiming, setLeadTiming] = useState<LeadTiming>(
    form?.leadTiming || 
    logic?.leadCollectionConfig?.leadTiming || 
    "BEGINNING"
  )
  const [leadFormStyle, setLeadFormStyle] = useState<LeadFormStyle>(
    form?.leadFormStyle || 
    logic?.leadCollectionConfig?.leadFormStyle || 
    "EMBEDDED"
  )
  const [cadence, setCadence] = useState<Cadence>(
    form?.cadence || 
    logic?.leadCollectionConfig?.cadence || 
    "ALL_AT_ONCE"
  )
  const [successMessage, setSuccessMessage] = useState(
    form?.successMessage || 
    logic?.leadCollectionConfig?.successMessage || 
    "Thank you! We'll be in touch soon."
  )
  const [redirectUrl, setRedirectUrl] = useState(
    form?.redirectUrl || 
    logic?.leadCollectionConfig?.redirectUrl || 
    ""
  )
  const [autoClose, setAutoClose] = useState(
    form?.autoClose ?? 
    logic?.leadCollectionConfig?.autoClose ?? 
    true
  )
  const [showThankYou, setShowThankYou] = useState(
    form?.showThankYou ?? 
    logic?.leadCollectionConfig?.showThankYou ?? 
    true
  )
  const [notifyEmail, setNotifyEmail] = useState(
    form?.notifyEmail || 
    logic?.leadCollectionConfig?.notifyEmail || 
    ""
  )
  const [webhookUrl, setWebhookUrl] = useState(
    form?.webhookUrl || 
    logic?.leadCollectionConfig?.webhookUrl || 
    ""
  )
  
  // Form fields (can come from form or logic)
  const [fields, setFields] = useState<FormField[]>(
    form?.fields || 
    logic?.leadCollectionConfig?.fields || 
    [
      { id: "1", type: "TEXT", label: "Name", required: true },
      { id: "2", type: "EMAIL", label: "Email", required: true },
      { id: "3", type: "PHONE", label: "Phone" },
      { id: "4", type: "TEXT", label: "Company" },
    ]
  )
  
  // Trigger settings from logic
  const defaultTrigger: TriggerConfig = {
    type: "KEYWORD",
    keywords: ["help", "info", "contact"],
    position: 0
  }
  
  const [trigger, setTrigger] = useState<TriggerConfig>(
    logic?.leadCollectionConfig?.trigger || 
    defaultTrigger
  )
  const [keywords, setKeywords] = useState<string[]>(trigger.keywords || [])
  const [newKeyword, setNewKeyword] = useState("")

  const fieldTypes: FieldType[] = ["TEXT", "EMAIL", "PHONE", "NUMBER", "CURRENCY", "DATE", "LINK", "SELECT", "RADIO", "CHECKBOX", "TEXTAREA", "MULTISELECT"]

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()]
      setKeywords(updatedKeywords)
      setTrigger({ ...trigger, keywords: updatedKeywords })
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    const updatedKeywords = keywords.filter(keyword => keyword !== keywordToRemove)
    setKeywords(updatedKeywords)
    setTrigger({ ...trigger, keywords: updatedKeywords })
  }

  const handleTriggerTypeChange = (type: TriggerType) => {
    setTrigger({ ...trigger, type })
  }

  const addField = () => {
    const newId = Date.now().toString()
    setFields([...fields, { 
      id: newId, 
      type: "TEXT", 
      label: `Field ${fields.length + 1}`, 
      required: true,
      order: fields.length
    }])
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleSubmit = async () => {
    // Prepare lead collection config
    const leadCollectionConfig: LeadCollectionConfig = {
      enabled: leadCollectionEnabled,
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
      trigger
    }

    // Prepare logic update
    const logicUpdate: Partial<ChatbotLogic> = {
      id: logic?.id,
      name,
      description,
      isActive,
      leadCollectionEnabled,
      leadCollectionConfig
    }

    // Prepare form update (if separate form exists)
    const formUpdate = form ? {
      id: form.id,
      title: formTitle,
      description: formDesc,
      fields,
      leadTiming,
      leadFormStyle,
      cadence,
      successMessage,
      redirectUrl: redirectUrl || undefined,
      autoClose,
      showThankYou,
      notifyEmail: notifyEmail || undefined,
      webhookUrl: webhookUrl || undefined,
    } : undefined

    await onSave(logicUpdate, formUpdate)
    onBack()
  }

  return (
    <>
      <div className="border-b py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">Collect Leads</h2>
            <p className="text-xs text-muted-foreground">Configure lead collection form</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={leadCollectionEnabled} 
              onCheckedChange={setLeadCollectionEnabled} 
            />
            <Label>Feature Enabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{isActive ? "Active" : "Inactive"}</Label>
          </div>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto">
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
            <Select value={trigger.type} onValueChange={(value: TriggerType) => handleTriggerTypeChange(value)}>
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

          {trigger.type === "KEYWORD" && (
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

          {trigger.type === "MESSAGE_COUNT" && (
            <div className="space-y-2">
              <Label>Number of messages</Label>
              <Input 
                type="number" 
                value={trigger.messageCount || 3}
                onChange={(e) => setTrigger({ ...trigger, messageCount: parseInt(e.target.value) || 3 })}
                placeholder="Enter message count"
              />
            </div>
          )}

          {trigger.type === "TIME_DELAY" && (
            <div className="space-y-2">
              <Label>Time delay (seconds)</Label>
              <Input 
                type="number" 
                value={trigger.timeDelay || 30}
                onChange={(e) => setTrigger({ ...trigger, timeDelay: parseInt(e.target.value) || 30 })}
                placeholder="Enter delay in seconds"
              />
            </div>
          )}

          {trigger.type === "MANUAL" && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show as button</Label>
                <p className="text-xs text-muted-foreground">Display a button that users can click to show the form</p>
              </div>
              <Switch 
                checked={trigger.showOnButton ?? true}
                onCheckedChange={(checked) => setTrigger({ ...trigger, showOnButton: checked })}
              />
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
                {field.type === "SELECT" || field.type === "RADIO" || field.type === "CHECKBOX" || field.type === "MULTISELECT" ? (
                  <div className="mt-2">
                    <Label className="text-xs">Options (comma-separated)</Label>
                    <Input
                      value={field.options?.join(", ") || ""}
                      onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map(opt => opt.trim()) })}
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </div>

        {/* Form Settings */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Form Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>When to ask</Label>
              <Select value={leadTiming} onValueChange={(value: LeadTiming) => setLeadTiming(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNING">Beginning of conversation</SelectItem>
                  <SelectItem value="MIDDLE">Middle of conversation</SelectItem>
                  <SelectItem value="END">End of conversation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Form Style</Label>
              <Select value={leadFormStyle} onValueChange={(value: LeadFormStyle) => setLeadFormStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMBEDDED">Embedded Form</SelectItem>
                  <SelectItem value="MESSAGES">Chat Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select value={cadence} onValueChange={(value: Cadence) => setCadence(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_AT_ONCE">All at once</SelectItem>
                  <SelectItem value="ONE_BY_ONE">One by one</SelectItem>
                  <SelectItem value="GROUPED">Grouped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Form Description</Label>
            <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-2">
            <Label>Success Message</Label>
            <Input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Redirect URL (optional)</Label>
              <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Notification Email (optional)</Label>
              <Input value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} type="email" placeholder="email@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Webhook URL (optional)</Label>
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://webhook.example.com" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-close after submission</Label>
              <p className="text-xs text-muted-foreground">Automatically close the form after successful submission</p>
            </div>
            <Switch checked={autoClose} onCheckedChange={setAutoClose} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Show thank you message</Label>
              <p className="text-xs text-muted-foreground">Display a thank you message after form submission</p>
            </div>
            <Switch checked={showThankYou} onCheckedChange={setShowThankYou} />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}