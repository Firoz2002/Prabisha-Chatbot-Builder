import { useState } from "react"
import { Loader2, Save, X, ChevronLeft } from "lucide-react"

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
  LinkButtonConfig, 
  TriggerType,
  ButtonSize,
  TriggerConfig
} from "@/types/chatbot-logic"

// Icon mapping (you might want to move this to a separate utils file)
const iconOptions = [
  { value: "Calendar", label: "Calendar" },
  { value: "Clock", label: "Clock" },
  { value: "Video", label: "Video" },
  { value: "Phone", label: "Phone" },
  { value: "MessageSquare", label: "Message" },
  { value: "Mail", label: "Mail" },
  { value: "Users", label: "Users" },
  { value: "User", label: "User" },
  { value: "Globe", label: "Globe" },
  { value: "Link", label: "Link" },
  { value: "ExternalLink", label: "External Link" },
  { value: "ArrowRight", label: "Arrow Right" },
  { value: "ChevronRight", label: "Chevron Right" },
  { value: "Download", label: "Download" },
  { value: "Upload", label: "Upload" },
  { value: "FileText", label: "File" },
]

interface LinkButtonFormProps {
  onBack: () => void
  onSave: (logic: Partial<ChatbotLogic>) => Promise<void>
  isLoading: boolean
  initial?: {
    logic?: ChatbotLogic
  }
}

export function LinkButtonForm({ onBack, onSave, isLoading, initial }: LinkButtonFormProps) {
  // Get initial values from existing logic
  const logic = initial?.logic
  
  // Logic settings
  const [name, setName] = useState(logic?.name || "Link Button")
  const [description, setDescription] = useState(logic?.description || "Add a clickable button to redirect users")
  const [isActive, setIsActive] = useState(logic?.isActive ?? true)
  const [linkButtonEnabled, setLinkButtonEnabled] = useState(logic?.linkButtonEnabled ?? false)
  
  // Default trigger with required type
  const defaultTrigger: TriggerConfig = {
    type: "KEYWORD",
    keywords: ["meeting", "schedule", "call"],
    position: 0
  }
  
  // Link button configuration
  const defaultLinkButtonConfig: LinkButtonConfig = {
    enabled: false,
    buttonText: "Schedule Meeting",
    buttonIcon: "Calendar",
    buttonLink: "https://calendly.com/your-link",
    openInNewTab: true,
    buttonColor: "#3b82f6",
    textColor: "#ffffff",
    buttonSize: "MEDIUM",
    trigger: defaultTrigger
  }
  
  const [linkButtonConfig, setLinkButtonConfig] = useState<LinkButtonConfig>(
    logic?.linkButtonConfig || defaultLinkButtonConfig
  )
  
  // Ensure trigger always has a type
  const trigger = linkButtonConfig.trigger || defaultTrigger
  
  // Trigger settings
  const [keywords, setKeywords] = useState<string[]>(trigger.keywords || [])
  const [newKeyword, setNewKeyword] = useState("")

  const handleTriggerTypeChange = (type: TriggerType) => {
    setLinkButtonConfig({
      ...linkButtonConfig,
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
      setLinkButtonConfig({
        ...linkButtonConfig,
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
    setLinkButtonConfig({
      ...linkButtonConfig,
      trigger: { 
        ...trigger, 
        keywords: updatedKeywords,
        type: trigger.type // Ensure type is preserved
      }
    })
  }

  const updateLinkButtonConfig = (updates: Partial<LinkButtonConfig>) => {
    setLinkButtonConfig({ 
      ...linkButtonConfig, 
      ...updates,
      // Ensure trigger is always defined with a type
      trigger: updates.trigger ? { 
        ...trigger, 
        ...updates.trigger,
        type: updates.trigger.type || trigger.type // Always keep a type
      } : trigger
    })
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

    // Prepare link button config with trigger
    const updatedConfig: LinkButtonConfig = {
      ...linkButtonConfig,
      enabled: linkButtonEnabled,
      trigger: finalTrigger
    }

    // Prepare logic update
    const logicUpdate: Partial<ChatbotLogic> = {
      id: logic?.id,
      name,
      description,
      isActive,
      linkButtonEnabled,
      linkButtonConfig: updatedConfig
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
            <h2 className="font-semibold text-foreground">Link Button</h2>
            <p className="text-xs text-muted-foreground">Configure clickable button settings</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={linkButtonEnabled} 
              onCheckedChange={setLinkButtonEnabled} 
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
            <Label>When to show button</Label>
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
                <SelectItem value="MANUAL">Manual trigger</SelectItem>
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
                onChange={(e) => updateLinkButtonConfig({
                  ...linkButtonConfig,
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
                onChange={(e) => updateLinkButtonConfig({
                  ...linkButtonConfig,
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
                <p className="text-xs text-muted-foreground">Display this as a clickable button in the chat interface</p>
              </div>
              <Switch 
                checked={trigger.showOnButton ?? true}
                onCheckedChange={(checked) => updateLinkButtonConfig({
                  ...linkButtonConfig,
                  trigger: { 
                    ...trigger, 
                    showOnButton: checked 
                  }
                })}
              />
            </div>
          )}
        </div>

        {/* Button Configuration */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Button Configuration</h3>
          
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input 
              value={linkButtonConfig.buttonText} 
              onChange={(e) => updateLinkButtonConfig({ buttonText: e.target.value })}
              placeholder="Enter button text"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Button Link</Label>
            <Input 
              value={linkButtonConfig.buttonLink} 
              onChange={(e) => updateLinkButtonConfig({ buttonLink: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Icon</Label>
              <Select 
                value={linkButtonConfig.buttonIcon || "Calendar"} 
                onValueChange={(value) => updateLinkButtonConfig({ buttonIcon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Button Size</Label>
              <Select 
                value={linkButtonConfig.buttonSize || "MEDIUM"} 
                onValueChange={(value: ButtonSize) => updateLinkButtonConfig({ buttonSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMALL">Small</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LARGE">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={linkButtonConfig.buttonColor || "#3b82f6"} 
                  onChange={(e) => updateLinkButtonConfig({ buttonColor: e.target.value })}
                  placeholder="#3b82f6"
                />
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: linkButtonConfig.buttonColor || "#3b82f6" }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={linkButtonConfig.textColor || "#ffffff"} 
                  onChange={(e) => updateLinkButtonConfig({ textColor: e.target.value })}
                  placeholder="#ffffff"
                />
                <div 
                  className="w-8 h-8 rounded border flex items-center justify-center"
                  style={{ 
                    backgroundColor: linkButtonConfig.textColor || "#ffffff",
                    color: linkButtonConfig.buttonColor || "#3b82f6" 
                  }}
                >
                  Aa
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Open in new tab</Label>
              <p className="text-xs text-muted-foreground">Open the link in a new browser tab</p>
            </div>
            <Switch 
              checked={linkButtonConfig.openInNewTab ?? true}
              onCheckedChange={(checked) => updateLinkButtonConfig({ openInNewTab: checked })}
            />
          </div>
          
          {/* Button Preview */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-semibold text-foreground">Button Preview</Label>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Button
                style={{
                  backgroundColor: linkButtonConfig.buttonColor || "#3b82f6",
                  color: linkButtonConfig.textColor || "#ffffff",
                  fontSize: linkButtonConfig.buttonSize === "SMALL" ? "0.875rem" : 
                           linkButtonConfig.buttonSize === "LARGE" ? "1.125rem" : "1rem",
                  padding: linkButtonConfig.buttonSize === "SMALL" ? "0.375rem 0.75rem" :
                          linkButtonConfig.buttonSize === "LARGE" ? "0.75rem 1.5rem" : "0.5rem 1rem"
                }}
              >
                {linkButtonConfig.buttonText}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                This is how your button will appear in the chat.
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