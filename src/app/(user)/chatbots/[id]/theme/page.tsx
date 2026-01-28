"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Upload, Check, X, EyeOff } from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useChatbot } from "@/providers/chatbot-provider"

export default function ThemePage() {
  const { config, updateConfig, refreshConfig } = useChatbot()

  // Local state for files (not stored in context)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)

  const colors = [
    { name: "blue", label: "Blue", value: "#3b82f6" },
    { name: "black", label: "Black", value: "#000000" },
    { name: "purple", label: "Purple", value: "#a855f7" },
    { name: "green", label: "Green", value: "#16a34a" },
    { name: "red", label: "Red", value: "#dc2626" },
    { name: "orange", label: "Orange", value: "#ea580c" },
  ]

  // Special option for no background color
  const noBgColor = { name: "none", label: "No Background", value: "transparent" }

  const getColorValue = (colorName: string) => {
    if (colorName === "none") return "transparent"
    const colorObj = colors.find((c) => c.name === colorName)
    return colorObj ? colorObj.value : "#3b82f6"
  }

  const getShapeClass = (shape: string) => {
    switch (shape) {
      case "round":
        return "rounded-full"
      case "square":
        return "rounded-none"
      case "rounded":
        return "rounded-lg"
      default:
        return "rounded-full"
    }
  }

  const shapeOptions = [
    { value: "round", label: "Round" },
    { value: "square", label: "Square" },
    { value: "rounded", label: "Rounded Square" },
  ]

  const borderOptions = [
    { value: "flat", label: "Flat" },
    { value: "round", label: "Round" },
    { value: "rounded", label: "Rounded Flat" },
  ]

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImageCallback: (value: string) => void,
    setFileCallback: (file: File) => void,
    type: 'avatar' | 'icon'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string
      setImageCallback(imageDataUrl)
      setFileCallback(file)
      
      // Update context with the data URL for immediate preview
      if (type === 'avatar') {
        updateConfig({ avatar: imageDataUrl })
      } else {
        updateConfig({ icon: imageDataUrl })
      }
      
      toast.success(`${type === 'avatar' ? 'Avatar' : 'Icon'} uploaded successfully`)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    updateConfig({ avatar: null })
    setAvatarFile(null)
    toast.success("Avatar removed")
  }

  const handleRemoveIcon = () => {
    updateConfig({ icon: null })
    setIconFile(null)
    toast.success("Icon removed")
  }

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      
      // Add text fields
      formData.append("theme", config.theme)
      formData.append("popup_onload", config.popupOnload.toString())
      formData.append("avatarSize", config.avatarSize.toString())
      formData.append("avatarColor", config.avatarColor)
      formData.append("avatarBorder", config.avatarBorder)
      formData.append("avatarBgColor", config.avatarBgColor)
      formData.append("iconSize", config.iconSize.toString())
      formData.append("iconColor", config.iconColor)
      formData.append("iconShape", config.iconShape)
      formData.append("iconBorder", config.iconBorder)
      formData.append("iconBgColor", config.iconBgColor)
      
      // Handle avatar upload
      if (avatarFile) {
        formData.append("avatar", avatarFile)
      } else if (config.avatar && !config.avatar.startsWith("data:")) {
        // If avatar is already a URL (from Cloudinary), send it as a parameter
        formData.append("avatarUrl", config.avatar)
      } else if (!config.avatar) {
        // If avatar is removed
        formData.append("removeAvatar", "true")
      }
      
      // Handle icon upload
      if (iconFile) {
        formData.append("icon", iconFile)
      } else if (config.icon && !config.icon.startsWith("data:")) {
        // If icon is already a URL (from Cloudinary), send it as a parameter
        formData.append("iconUrl", config.icon)
      } else if (!config.icon) {
        // If icon is removed
        formData.append("removeIcon", "true")
      }

      const response = await fetch(`/api/chatbots/${config.id}`, {
        method: "PUT",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Theme changes saved successfully!")
        
        // Update context with server URLs and clear file state
        if (result.chatbot?.avatar !== undefined) {
          updateConfig({ avatar: result.chatbot.avatar })
          setAvatarFile(null)
        }
        if (result.chatbot?.icon !== undefined) {
          updateConfig({ icon: result.chatbot.icon })
          setIconFile(null)
        }
        
        // Refresh config from server to ensure consistency
        await refreshConfig()
      } else {
        toast.error(result.error || "Failed to save changes")
      }
    } catch (error) {
      console.error("Error saving theme changes:", error)
      toast.error("Error saving theme changes")
    } finally {
      setIsLoading(false)
    }
  }

  const renderImagePreview = (
    image: string | null,
    size: number,
    bgColor: string,
    border: string,
    shape: string,
    onRemove?: () => void,
    type: 'avatar' | 'icon' = 'icon'
  ) => {
    const hasBackground = bgColor !== "none"
    
    return (
      <>
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-medium text-muted-foreground">Preview</div>
          {onRemove && image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="w-3 h-3 mr-1" />
              Remove
            </Button>
          )}
        </div>
        <div className="flex justify-center py-6 bg-muted/50 rounded">
          <div
            className={`${getShapeClass(shape)} flex items-center justify-center overflow-hidden transition-all`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: getColorValue(bgColor),
              border: hasBackground && border === "round" ? `2px solid ${getColorValue("black")}` : "none",
              boxShadow: hasBackground && border === "rounded" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            {image ? (
              <img
                src={image || "/placeholder.svg"}
                alt={`${type} preview`}
                className={`w-full h-full object-cover ${!hasBackground ? 'p-1' : ''}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Upload className="w-6 h-6 mb-1 opacity-50" />
                <span className="text-xs">No {type}</span>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-8 pb-6">
      {/* Theme Selection */}
      <SettingsSection title="Color Theme">
        <div className="space-y-3">
          <Label htmlFor="theme" className="font-medium">
            Select Theme
          </Label>
          <Select 
            value={config.theme} 
            onValueChange={(value) => updateConfig({ theme: value as 'light' | 'dark' })}
          >
            <SelectTrigger id="theme" className="w-full">
              <SelectValue placeholder="Select a theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Changes the overall color scheme of your chatbot
          </p>
        </div>
      </SettingsSection>

      {/* Icon Settings */}
      <SettingsSection title="Chatbot Icon">
        <div className="space-y-4">
          {/* Upload & Shape */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-2">Upload Icon</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.getElementById("icon-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {config.icon ? "Change Icon" : "Upload Icon"}
                </Button>
                <input
                  id="icon-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, (url) => updateConfig({ icon: url }), setIconFile, 'icon')}
                />
                {config.icon && (
                  <div className="text-xs text-green-600 font-medium flex items-center">
                    <Check className="w-3 h-3 mr-1" /> Icon selected
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="icon-shape" className="font-medium">
                Shape
              </Label>
              <Select 
                value={config.iconShape} 
                onValueChange={(value) => updateConfig({ iconShape: value })}
              >
                <SelectTrigger id="icon-shape" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shapeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Icon Size */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="font-medium">Size</Label>
              <span className="text-sm font-semibold text-primary">{config.iconSize}px</span>
            </div>
            <Slider 
              value={[config.iconSize]} 
              onValueChange={(val) => updateConfig({ iconSize: val[0] })} 
              min={20} 
              max={100} 
              step={5} 
            />
          </div>

          {/* Icon Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-medium block mb-2">Icon Color</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={`icon-color-${color.name}`}
                    onClick={() => updateConfig({ iconColor: color.name })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.iconColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    type="button"
                    aria-label={`Set icon color to ${color.label}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="font-medium block mb-2">Background</Label>
              <div className="flex flex-wrap gap-2">
                {/* Add the "no background" option first */}
                <button
                  key={`icon-bg-none`}
                  onClick={() => updateConfig({ iconBgColor: "none" })}
                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                    config.iconBgColor === "none" ? "border-foreground ring-2 ring-offset-1" : "border-border"
                  }`}
                  style={{ backgroundColor: "transparent" }}
                  title="No Background"
                  type="button"
                  aria-label="Remove icon background"
                >
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                </button>
                
                {/* Regular color options */}
                {colors.map((color) => (
                  <button
                    key={`icon-bg-${color.name}`}
                    onClick={() => updateConfig({ iconBgColor: color.name })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.iconBgColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    type="button"
                    aria-label={`Set icon background to ${color.label}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Icon Border */}
          <div>
            <Label htmlFor="icon-border" className="font-medium">
              Border Style
            </Label>
            <Select 
              value={config.iconBorder} 
              onValueChange={(value) => updateConfig({ iconBorder: value })}
            >
              <SelectTrigger id="icon-border" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Border styles only apply when background is selected
            </p>
          </div>

          {/* Icon Preview */}
          {renderImagePreview(
            config.icon, 
            config.iconSize, 
            config.iconBgColor, 
            config.iconBorder, 
            config.iconShape, 
            handleRemoveIcon,
            'icon'
          )}
        </div>
      </SettingsSection>

      {/* Avatar Settings */}
      <SettingsSection title="Chatbot Avatar">
        <div className="space-y-4">
          {/* Upload & Border */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-2">Upload Avatar</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {config.avatar ? "Change Avatar" : "Upload Avatar"}
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, (url) => updateConfig({ avatar: url }), setAvatarFile, 'avatar')}
                />
                {config.avatar && (
                  <div className="text-xs text-green-600 font-medium flex items-center">
                    <Check className="w-3 h-3 mr-1" /> Avatar selected
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="avatar-border" className="font-medium">
                Border Style
              </Label>
              <Select 
                value={config.avatarBorder} 
                onValueChange={(value) => updateConfig({ avatarBorder: value })}
              >
                <SelectTrigger id="avatar-border" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {borderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Note: Border styles only apply when background is selected
              </p>
            </div>
          </div>

          {/* Avatar Size */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="font-medium">Size</Label>
              <span className="text-sm font-semibold text-primary">{config.avatarSize}px</span>
            </div>
            <Slider
              value={[config.avatarSize]}
              onValueChange={(val) => updateConfig({ avatarSize: val[0] })}
              min={20}
              max={120}
              step={5}
            />
          </div>

          {/* Avatar Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-medium block mb-2">Avatar Color</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={`avatar-color-${color.name}`}
                    onClick={() => updateConfig({ avatarColor: color.name })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.avatarColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    type="button"
                    aria-label={`Set avatar color to ${color.label}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="font-medium block mb-2">Background</Label>
              <div className="flex flex-wrap gap-2">
                {/* Add the "no background" option first */}
                <button
                  key={`avatar-bg-none`}
                  onClick={() => updateConfig({ avatarBgColor: "none" })}
                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                    config.avatarBgColor === "none" ? "border-foreground ring-2 ring-offset-1" : "border-border"
                  }`}
                  style={{ backgroundColor: "transparent" }}
                  title="No Background"
                  type="button"
                  aria-label="Remove avatar background"
                >
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                </button>
                
                {/* Regular color options */}
                {colors.map((color) => (
                  <button
                    key={`avatar-bg-${color.name}`}
                    onClick={() => updateConfig({ avatarBgColor: color.name })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.avatarBgColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    type="button"
                    aria-label={`Set avatar background to ${color.label}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Avatar Preview */}
          {renderImagePreview(
            config.avatar, 
            config.avatarSize, 
            config.avatarBgColor, 
            config.avatarBorder, 
            "round", 
            handleRemoveAvatar,
            'avatar'
          )}
        </div>
      </SettingsSection>

      {/* Behavior Settings */}
      <SettingsSection title="Behavior">
        <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition">
          <Checkbox
            checked={config.popupOnload}
            onCheckedChange={(checked) => updateConfig({ popupOnload: checked as boolean })}
            className="mt-1"
          />
          <span className="text-sm leading-relaxed">
            <div className="font-medium">Auto-open on page load</div>
            <div className="text-xs text-muted-foreground">
              Opens chatbot popup automatically when users visit your website (desktop only)
            </div>
          </span>
        </label>
      </SettingsSection>

      {/* Save Button */}
      <div className="pt-4 border-t">
        <Button
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            "Saving..."
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Theme Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

interface SettingsSectionProps {
  title: string
  icon?: string
  children: React.ReactNode
}

function SettingsSection({ title, icon, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4 pb-6 border-b border-border">
      <div className="flex items-center space-x-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="font-bold text-foreground text-lg">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}