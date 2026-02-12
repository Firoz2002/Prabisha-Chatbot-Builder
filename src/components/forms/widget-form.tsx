"use client"

import { useState } from "react"
import { Loader2, Save, ChevronLeft, Palette, MousePointer2, Upload, ImageIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectItem, 
  SelectValue, 
  SelectContent, 
  SelectTrigger 
} from "@/components/ui/select"

import { ShapeType, BorderType, Position, WidgetIconType } from "../../../generated/prisma/enums"

interface WidgetThemeFormProps {
  onBack: () => void
  onSave: (data: any) => Promise<void>
  isLoading: boolean
  initial?: any
}

export function WidgetThemeForm({ onBack, onSave, isLoading, initial }: WidgetThemeFormProps) {
  const [formData, setFormData] = useState({
    widgetIcon: initial?.widgetIcon || "💬",
    widgetIconType: (initial?.widgetIconType as WidgetIconType) || "EMOJI",
    widgetText: initial?.widgetText || "Chat with us",
    widgetSize: initial?.widgetSize || 70,
    widgetColor: initial?.widgetColor || "#3b82f6",
    widgetShape: (initial?.widgetShape as ShapeType) || "ROUND",
    widgetBorder: (initial?.widgetBorder as BorderType) || "FLAT",
    widgetBgColor: initial?.widgetBgColor || "#FFFFFF",
    widgetPosition: (initial?.widgetPosition as Position) || "BottomRight",
    widgetPadding: initial?.widgetPadding || 0,
    widgetMargin: initial?.widgetMargin || 20,
    popup_onload: initial?.popup_onload ?? false,
  })

  // Handle Image Upload to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, widgetIcon: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    await onSave(formData)
  }

  return (
    <>
      <div className="border-b py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Widget Customization</h2>
            <p className="text-xs text-muted-foreground">Adjust the look and feel of the chat bubble</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 py-4 overflow-y-auto max-h-[70vh]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="w-4 h-4" />
            Appearance
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Widget Icon Content</Label>
                <Select 
                  value={formData.widgetIconType} 
                  onValueChange={(v: WidgetIconType) => {
                    // Reset icon value when switching types to avoid format conflicts
                    const defaultValue = v === "EMOJI" ? "💬" : ""
                    setFormData({ ...formData, widgetIconType: v, widgetIcon: defaultValue })
                  }}
                >
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMOJI">Emoji</SelectItem>
                    <SelectItem value="SVG">SVG Path</SelectItem>
                    <SelectItem value="IMAGE">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Input based on Icon Type */}
              {formData.widgetIconType === "EMOJI" && (
                <Input 
                  value={formData.widgetIcon} 
                  onChange={(e) => setFormData({ ...formData, widgetIcon: e.target.value })}
                  placeholder="Paste an emoji here..."
                />
              )}

              {formData.widgetIconType === "SVG" && (
                <Textarea 
                  value={formData.widgetIcon} 
                  onChange={(e) => setFormData({ ...formData, widgetIcon: e.target.value })}
                  placeholder='Paste SVG path or code (e.g., <path d="..." />)'
                  className="font-mono text-xs min-h-[80px]"
                />
              )}

              {formData.widgetIconType === "IMAGE" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/30">
                    <div className="h-12 w-12 rounded-md border bg-background flex items-center justify-center overflow-hidden">
                      {formData.widgetIcon && formData.widgetIcon.startsWith('data:image') ? (
                        <img src={formData.widgetIcon} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Input 
                        type="file" 
                        accept="image/*"
                        className="text-xs"
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select 
                  value={formData.widgetPosition} 
                  onValueChange={(v: Position) => setFormData({ ...formData, widgetPosition: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BottomRight">Bottom Right</SelectItem>
                    <SelectItem value="BottomLeft">Bottom Left</SelectItem>
                    <SelectItem value="TopRight">Top Right</SelectItem>
                    <SelectItem value="TopLeft">Top Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="color" 
                    className="w-10 h-10 p-1 cursor-pointer" 
                    value={formData.widgetColor} 
                    onChange={(e) => setFormData({ ...formData, widgetColor: e.target.value })}
                  />
                  <Input 
                    value={formData.widgetColor} 
                    onChange={(e) => setFormData({ ...formData, widgetColor: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Widget Shape</Label>
              <Select 
                value={formData.widgetShape} 
                onValueChange={(v: ShapeType) => setFormData({ ...formData, widgetShape: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUND">Round</SelectItem>
                  <SelectItem value="SQUARE">Square</SelectItem>
                  <SelectItem value="ROUNDED_SQUARE">Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Add placeholder for other styling if needed */}
          </div>
        </div>

        {/* Layout Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MousePointer2 className="w-4 h-4" />
            Size & Spacing
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Size</Label>
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{formData.widgetSize}px</span>
              </div>
              <Slider 
                value={[formData.widgetSize]} 
                min={40} max={100} step={1} 
                onValueChange={([v]) => setFormData({ ...formData, widgetSize: v })} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Distance from Edge</Label>
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{formData.widgetMargin}px</span>
              </div>
              <Slider 
                value={[formData.widgetMargin]} 
                min={0} max={100} step={1} 
                onValueChange={([v]) => setFormData({ ...formData, widgetMargin: v })} 
              />
            </div>
          </div>
        </div>

        {/* Behavior Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-open on load</Label>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expand window by default</p>
            </div>
            <Switch 
              checked={formData.popup_onload} 
              onCheckedChange={(v) => setFormData({ ...formData, popup_onload: v })}
            />
          </div>
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
            Save Theme
          </Button>
        </div>
      </div>
    </>
  )
}