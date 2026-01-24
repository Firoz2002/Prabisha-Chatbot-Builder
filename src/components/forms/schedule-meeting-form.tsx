import { useState } from "react"
import { Loader2, Save, X, ChevronLeft } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Import types from your types file
import type { 
  ChatbotLogic, 
  MeetingScheduleConfig, 
  TriggerConfig, 
  TriggerType,
  CalendarType
} from "@/types/chatbot-logic"

// Timezone options (you might want to move this to a separate utils file)
const commonTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney"
]

// Availability days
const weekDays = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
]

// Time slots
const timeSlots = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
]

interface ScheduleMeetingFormProps {
  onBack: () => void
  onSave: (logic: Partial<ChatbotLogic>) => Promise<void>
  isLoading: boolean
  initial?: {
    logic?: ChatbotLogic
  }
}

export function ScheduleMeetingForm({ onBack, onSave, isLoading, initial }: ScheduleMeetingFormProps) {
  // Get initial values from existing logic
  const logic = initial?.logic
  
  // Logic settings
  const [name, setName] = useState(logic?.name || "Schedule Meeting")
  const [description, setDescription] = useState(logic?.description || "Allow users to schedule meetings directly from chat")
  const [isActive, setIsActive] = useState(logic?.isActive ?? true)
  const [meetingScheduleEnabled, setMeetingScheduleEnabled] = useState(logic?.meetingScheduleEnabled ?? false)
  
  // Default trigger with required type
  const defaultTrigger: TriggerConfig = {
    type: "KEYWORD",
    keywords: ["meeting", "schedule", "call"],
    position: 0
  }
  
  // Default availability hours
  const defaultAvailabilityHours = { start: "09:00", end: "17:00" }
  
  // Meeting schedule configuration
  const defaultMeetingScheduleConfig: MeetingScheduleConfig = {
    enabled: false,
    calendarType: "CALENDLY",
    calendarLink: "",
    duration: 30,
    timezone: "UTC",
    titleFormat: "Meeting with {company}",
    description: "",
    availabilityDays: [1, 2, 3, 4, 5], // Monday to Friday
    availabilityHours: defaultAvailabilityHours,
    bufferTime: 5,
    showTimezoneSelector: true,
    requireConfirmation: false,
    trigger: defaultTrigger
  }
  
  const [meetingScheduleConfig, setMeetingScheduleConfig] = useState<MeetingScheduleConfig>(
    logic?.meetingScheduleConfig || defaultMeetingScheduleConfig
  )
  
  // Ensure trigger always has a type
  const trigger = meetingScheduleConfig.trigger || defaultTrigger
  
  // Ensure availabilityHours always has both properties
  const availabilityHours = meetingScheduleConfig.availabilityHours || defaultAvailabilityHours
  
  // Trigger settings
  const [keywords, setKeywords] = useState<string[]>(trigger.keywords || [])
  const [newKeyword, setNewKeyword] = useState("")

  const handleTriggerTypeChange = (type: TriggerType) => {
    setMeetingScheduleConfig({
      ...meetingScheduleConfig,
      trigger: { 
        ...trigger, 
        type,
        // Reset conditional fields when changing type
        ...(type !== "KEYWORD" && { keywords: [] }),
        ...(type !== "MESSAGE_COUNT" && { messageCount: undefined }),
        ...(type !== "TIME_DELAY" && { timeDelay: undefined }),
      }
    })
    
    // Also update local keywords state
    if (type !== "KEYWORD") {
      setKeywords([])
    }
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()]
      setKeywords(updatedKeywords)
      setMeetingScheduleConfig({
        ...meetingScheduleConfig,
        trigger: { 
          ...trigger, 
          keywords: updatedKeywords,
          type: trigger.type // Ensure type is preserved
        }
      })
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    const updatedKeywords = keywords.filter(keyword => keyword !== keywordToRemove)
    setKeywords(updatedKeywords)
    setMeetingScheduleConfig({
      ...meetingScheduleConfig,
      trigger: { 
        ...trigger, 
        keywords: updatedKeywords,
        type: trigger.type // Ensure type is preserved
      }
    })
  }

  const updateMeetingScheduleConfig = (updates: Partial<MeetingScheduleConfig>) => {
    setMeetingScheduleConfig({ 
      ...meetingScheduleConfig, 
      ...updates,
      // Ensure availabilityHours always has both properties
      availabilityHours: updates.availabilityHours ? {
        start: updates.availabilityHours.start || availabilityHours.start,
        end: updates.availabilityHours.end || availabilityHours.end
      } : meetingScheduleConfig.availabilityHours,
      // Ensure trigger is always defined with a type
      trigger: updates.trigger ? { 
        ...trigger, 
        ...updates.trigger,
        type: updates.trigger.type || trigger.type // Always keep a type
      } : trigger
    })
  }

  const toggleAvailabilityDay = (day: number) => {
    const currentDays = meetingScheduleConfig.availabilityDays || []
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b)
    
    updateMeetingScheduleConfig({ availabilityDays: updatedDays })
  }

  const handleSubmit = async () => {
    // Ensure trigger has required properties
    const finalTrigger: TriggerConfig = {
      type: trigger.type || "KEYWORD",
      keywords: trigger.keywords || [],
      position: trigger.position || 0,
      ...(trigger.messageCount !== undefined && { messageCount: trigger.messageCount }),
      ...(trigger.timeDelay !== undefined && { timeDelay: trigger.timeDelay }),
      ...(trigger.showOnButton !== undefined && { showOnButton: trigger.showOnButton }),
    }

    // Prepare meeting schedule config with trigger
    const updatedConfig: MeetingScheduleConfig = {
      ...meetingScheduleConfig,
      enabled: meetingScheduleEnabled,
      trigger: finalTrigger,
      // Ensure availabilityHours is always defined with both properties
      availabilityHours: meetingScheduleConfig.availabilityHours || defaultAvailabilityHours
    }

    // Prepare logic update
    const logicUpdate: Partial<ChatbotLogic> = {
      id: logic?.id,
      name,
      description,
      isActive,
      meetingScheduleEnabled,
      meetingScheduleConfig: updatedConfig
    }

    await onSave(logicUpdate)
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
            <h2 className="font-semibold text-foreground">Schedule Meeting</h2>
            <p className="text-xs text-muted-foreground">Configure meeting scheduling settings</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={meetingScheduleEnabled} 
              onCheckedChange={setMeetingScheduleEnabled} 
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
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter logic name" 
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Enter description" 
            />
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Trigger Configuration</h3>
          <div className="space-y-2">
            <Label>When to show calendar</Label>
            <Select 
              value={trigger.type} 
              onValueChange={(value: TriggerType) => handleTriggerTypeChange(value)}
            >
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
                onChange={(e) => updateMeetingScheduleConfig({
                  ...meetingScheduleConfig,
                  trigger: { 
                    ...trigger, 
                    messageCount: parseInt(e.target.value) || 3 
                  }
                })}
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
                onChange={(e) => updateMeetingScheduleConfig({
                  ...meetingScheduleConfig,
                  trigger: { 
                    ...trigger, 
                    timeDelay: parseInt(e.target.value) || 30 
                  }
                })}
                placeholder="Enter delay in seconds"
              />
            </div>
          )}

          {trigger.type === "MANUAL" && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show as button in chat</Label>
                <p className="text-xs text-muted-foreground">Display a button that users can click to show the calendar</p>
              </div>
              <Switch 
                checked={trigger.showOnButton ?? true}
                onCheckedChange={(checked) => updateMeetingScheduleConfig({
                  ...meetingScheduleConfig,
                  trigger: { 
                    ...trigger, 
                    showOnButton: checked 
                  }
                })}
              />
            </div>
          )}
        </div>

        {/* Calendar Configuration */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Calendar Configuration</h3>
          
          <div className="space-y-2">
            <Label>Calendar Type</Label>
            <Select 
              value={meetingScheduleConfig.calendarType || "CALENDLY"} 
              onValueChange={(value: CalendarType) => updateMeetingScheduleConfig({ calendarType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALENDLY">Calendly</SelectItem>
                <SelectItem value="GOOGLE_CALENDAR">Google Calendar</SelectItem>
                <SelectItem value="OUTLOOK_CALENDAR">Outlook Calendar</SelectItem>
                <SelectItem value="CUSTOM">Custom Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Calendar Link/ID</Label>
            <Input 
              value={meetingScheduleConfig.calendarLink} 
              onChange={(e) => updateMeetingScheduleConfig({ calendarLink: e.target.value })}
              placeholder={
                meetingScheduleConfig.calendarType === "CALENDLY" ? "https://calendly.com/your-link" :
                meetingScheduleConfig.calendarType === "GOOGLE_CALENDAR" ? "Google Calendar ID" :
                meetingScheduleConfig.calendarType === "OUTLOOK_CALENDAR" ? "Outlook Calendar ID" :
                "Your calendar embed URL"
              }
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meeting Duration (minutes)</Label>
              <Input 
                type="number" 
                value={meetingScheduleConfig.duration || 30}
                onChange={(e) => updateMeetingScheduleConfig({ duration: parseInt(e.target.value) || 30 })}
                placeholder="30"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <Select 
                value={meetingScheduleConfig.timezone || "UTC"} 
                onValueChange={(value) => updateMeetingScheduleConfig({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commonTimezones.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Meeting Title Format</Label>
            <Input 
              value={meetingScheduleConfig.titleFormat || "Meeting with {company}"} 
              onChange={(e) => updateMeetingScheduleConfig({ titleFormat: e.target.value })}
              placeholder="Meeting with {company}"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{company}"} or {"{name}"} as placeholders
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Meeting Description</Label>
            <Textarea 
              value={meetingScheduleConfig.description || ""} 
              onChange={(e) => updateMeetingScheduleConfig({ description: e.target.value })}
              placeholder="Optional meeting description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Buffer Time Between Meetings (minutes)</Label>
            <Input 
              type="number" 
              value={meetingScheduleConfig.bufferTime || 5}
              onChange={(e) => updateMeetingScheduleConfig({ bufferTime: parseInt(e.target.value) || 5 })}
              placeholder="5"
            />
          </div>
        </div>

        {/* Availability Settings */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Availability Settings</h3>
          
          <div className="space-y-2">
            <Label>Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => (
                <Badge
                  key={day.value}
                  variant={meetingScheduleConfig.availabilityDays?.includes(day.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleAvailabilityDay(day.value)}
                >
                  {day.label}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Available From</Label>
              <Select 
                value={availabilityHours.start} 
                onValueChange={(value) => updateMeetingScheduleConfig({ 
                  availabilityHours: { 
                    start: value,
                    end: availabilityHours.end
                  } 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Available Until</Label>
              <Select 
                value={availabilityHours.end} 
                onValueChange={(value) => updateMeetingScheduleConfig({ 
                  availabilityHours: { 
                    start: availabilityHours.start,
                    end: value
                  } 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Show timezone selector</Label>
              <p className="text-xs text-muted-foreground">Allow users to select their timezone</p>
            </div>
            <Switch 
              checked={meetingScheduleConfig.showTimezoneSelector ?? true}
              onCheckedChange={(checked) => updateMeetingScheduleConfig({ showTimezoneSelector: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require confirmation</Label>
              <p className="text-xs text-muted-foreground">Require users to confirm meeting details</p>
            </div>
            <Switch 
              checked={meetingScheduleConfig.requireConfirmation || false}
              onCheckedChange={(checked) => updateMeetingScheduleConfig({ requireConfirmation: checked })}
            />
          </div>
          
          {/* Availability Preview */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-semibold text-foreground">Availability Preview</Label>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm">
                Meetings available on:{" "}
                {meetingScheduleConfig.availabilityDays?.map(day => 
                  weekDays.find(d => d.value === day)?.label
                ).join(", ")}
              </p>
              <p className="text-sm mt-1">
                From {availabilityHours.start} to {availabilityHours.end} ({meetingScheduleConfig.timezone})
              </p>
              <p className="text-sm mt-1">
                Duration: {meetingScheduleConfig.duration} minutes
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This is when users can schedule meetings with you.
              </p>
            </div>
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