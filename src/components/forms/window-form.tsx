"use client"

import { useState } from "react"
import { Loader2, Save, ChevronLeft, Layout, Type, Palette } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectItem, 
  SelectValue, 
  SelectContent, 
  SelectTrigger 
} from "@/components/ui/select"

import { BorderType } from "../../../generated/prisma/enums";

interface WindowThemeFormProps {
  onBack: () => void
  onSave: (data: any) => Promise<void>
  isLoading: boolean
  initial?: any
}

export function WindowThemeForm({ onBack, onSave, isLoading, initial }: WindowThemeFormProps) {
  // Using fields relevant to the Window interface
  const [formData, setFormData] = useState({
    // We can pull these from the main Chatbot model or Theme model depending on your API
    greeting: initial?.chatbot?.greeting || "Hi there! How can I help you today?",
    widgetText: initial?.widgetText || "Chat with us",
    widgetBgColor: initial?.widgetBgColor || "#FFFFFF",
    avatarBorder: (initial?.chatbot?.avatarBorder as BorderType) || "FLAT",
    // Placeholder for future window-specific schema additions
    brandColor: initial?.widgetColor || "#3b82f6", 
  })

  const handleSubmit = async () => {
    // Spreading the existing initial data to ensure we don't overwrite widget settings
    await onSave({
      ...initial,
      ...formData,
    })
  }

  return (
    <>
      <div className="border-b py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Window Customization</h2>
            <p className="text-xs text-muted-foreground">Configure the chat interface appearance</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 py-4 overflow-y-auto max-h-[70vh]">
        {/* Header & Branding */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Type className="w-4 h-4" />
            Content & Branding
          </div>
          
          <div className="space-y-2">
            <Label>Chat Title</Label>
            <Input 
              value={formData.widgetText} 
              onChange={(e) => setFormData({ ...formData, widgetText: e.target.value })}
              placeholder="e.g. Support Chat"
            />
          </div>

          <div className="space-y-2">
            <Label>Default Greeting</Label>
            <Textarea 
              value={formData.greeting} 
              onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
              placeholder="The first message users see..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Styling Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="w-4 h-4" />
            Window Styling
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Window Background</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="color" 
                  className="w-10 h-10 p-1" 
                  value={formData.widgetBgColor} 
                  onChange={(e) => setFormData({ ...formData, widgetBgColor: e.target.value })}
                />
                <Input 
                  value={formData.widgetBgColor} 
                  onChange={(e) => setFormData({ ...formData, widgetBgColor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Avatar Style</Label>
              <Select 
                value={formData.avatarBorder} 
                onValueChange={(v: BorderType) => setFormData({ ...formData, avatarBorder: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">Flat (No Border)</SelectItem>
                  <SelectItem value="ROUND">Circular</SelectItem>
                  <SelectItem value="ROUNDED_FLAT">Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preview Section Placeholder */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
          <Layout className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">
            Window preview coming soon.<br/>All changes will apply to the live chat interface.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Window Settings
          </Button>
        </div>
      </div>
    </>
  )
}