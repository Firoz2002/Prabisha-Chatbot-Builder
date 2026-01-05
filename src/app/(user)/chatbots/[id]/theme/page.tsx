"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Upload, Check } from "lucide-react"
import Chat from "@/components/features/chat"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ThemePage() {
  const params = useParams()
  const chatbotId = params.id as string

  // Theme Settings
  const [theme, setTheme] = useState("light")

  // Avatar Settings
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarSize, setAvatarSize] = useState(50)
  const [avatarColor, setAvatarColor] = useState("blue")
  const [avatarBorder, setAvatarBorder] = useState("flat")
  const [avatarBgColor, setAvatarBgColor] = useState("blue")

  // Icon Settings
  const [icon, setIcon] = useState<string | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconSize, setIconSize] = useState(50)
  const [iconColor, setIconColor] = useState("white")
  const [iconShape, setIconShape] = useState("round")
  const [iconBorder, setIconBorder] = useState("flat")
  const [iconBgColor, setIconBgColor] = useState("blue")

  // Behavior Settings
  const [popupOnload, setPopupOnload] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const colors = [
    { name: "blue", label: "Blue", value: "#3b82f6" },
    { name: "black", label: "Black", value: "#000000" },
    { name: "purple", label: "Purple", value: "#a855f7" },
    { name: "green", label: "Green", value: "#16a34a" },
    { name: "red", label: "Red", value: "#dc2626" },
    { name: "orange", label: "Orange", value: "#ea580c" },
  ]

  const getColorValue = (colorName: string) => {
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

  useEffect(() => {
    if (chatbotId) {
      fetch(`/api/chatbots/${chatbotId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch chatbot")
          return res.json()
        })
        .then((data) => {
          if (data.avatar) setAvatar(data.avatar)
          if (data.avatarSize) setAvatarSize(data.avatarSize)
          if (data.avatarColor) setAvatarColor(data.avatarColor)
          if (data.avatarBorder) setAvatarBorder(data.avatarBorder.toLowerCase())
          if (data.avatarBgColor) setAvatarBgColor(data.avatarBgColor)

          if (data.icon) setIcon(data.icon)
          if (data.iconSize) setIconSize(data.iconSize)
          if (data.iconColor) setIconColor(data.iconColor)
          if (data.iconShape) setIconShape(data.iconShape.toLowerCase())
          if (data.iconBorder) setIconBorder(data.iconBorder.toLowerCase())
          if (data.iconBgColor) setIconBgColor(data.iconBgColor)

          if (data.theme) setTheme(data.theme)
          if (data.popup_onload !== undefined) setPopupOnload(data.popup_onload)
        })
        .catch((error) => {
          console.error("Error fetching chatbot:", error)
          toast.error("Failed to load chatbot settings")
        })
    }
  }, [chatbotId])

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (value: string) => void,
    setFile: (file: File) => void
  ) => {
    const file = e.target.files?.[0]
    if (file) {
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
        setImage(event.target?.result as string)
        setFile(file)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatar(null)
    setAvatarFile(null)
  }

  const handleRemoveIcon = () => {
    setIcon(null)
    setIconFile(null)
  }

  const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "chatbot_app") // You need to create this in Cloudinary
    formData.append("folder", folder)

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Upload failed")
      }

      const data = await response.json()
      return data.secure_url
    } catch (error) {
      console.error("Cloudinary upload error:", error)
      throw error
    }
  }

  const handleSave = async () => {
    if (!chatbotId) {
      toast.error("Chatbot ID is missing")
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      
      // Add text fields
      formData.append("theme", theme)
      formData.append("popup_onload", popupOnload.toString())
      formData.append("avatarSize", avatarSize.toString())
      formData.append("avatarColor", avatarColor)
      formData.append("avatarBorder", avatarBorder)
      formData.append("avatarBgColor", avatarBgColor)
      formData.append("iconSize", iconSize.toString())
      formData.append("iconColor", iconColor)
      formData.append("iconShape", iconShape)
      formData.append("iconBorder", iconBorder)
      formData.append("iconBgColor", iconBgColor)
      
      // Handle avatar upload
      if (avatarFile) {
        formData.append("avatar", avatarFile)
      } else if (avatar && !avatar.startsWith("data:")) {
        // If avatar is already a URL (from Cloudinary), send it as a parameter
        formData.append("avatarUrl", avatar)
      }
      
      // Handle icon upload
      if (iconFile) {
        formData.append("icon", iconFile)
      } else if (icon && !icon.startsWith("data:")) {
        // If icon is already a URL (from Cloudinary), send it as a parameter
        formData.append("iconUrl", icon)
      }

      const response = await fetch(`/api/chatbots/${chatbotId}`, {
        method: "PUT",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Changes saved successfully!")
        
        // Update local state with the returned URLs
        if (result.chatbot?.avatar) {
          setAvatar(result.chatbot.avatar)
          setAvatarFile(null)
        }
        if (result.chatbot?.icon) {
          setIcon(result.chatbot.icon)
          setIconFile(null)
        }
      } else {
        toast.error(result.error || "Failed to save changes")
      }
    } catch (error) {
      console.error("Error saving changes:", error)
      toast.error("Error saving changes")
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
    onRemove?: () => void
  ) => {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-medium text-muted-foreground">Preview</div>
          {onRemove && image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          )}
        </div>
        <div className="flex justify-center py-6 bg-background rounded">
          <div
            className={`${getShapeClass(shape)} flex items-center justify-center overflow-hidden`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: getColorValue(bgColor),
              border: border === "outline" ? `2px solid ${getColorValue("black")}` : "none",
              boxShadow: border === "shadow" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            {image ? (
              <img
                src={image || "/placeholder.svg"}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-0 h-screen">
        {/* Left Panel - Settings */}
        <div className="overflow-y-auto border-r border-border bg-card">
          <div className="p-6 space-y-8">
            {/* Theme Selection */}
            <SettingsSection title="Theme">
              <div className="space-y-3">
                <Label htmlFor="theme" className="font-medium">
                  Color Theme
                </Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingsSection>

            {/* Icon Settings */}
            <SettingsSection title="Icon">
              <div className="space-y-4">
                {/* Upload & Shape */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium mb-2">Upload Icon</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-muted-foreground bg-transparent"
                        onClick={() => document.getElementById("icon-upload")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {icon ? "Change Icon" : "Upload Icon"}
                      </Button>
                      <input
                        id="icon-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setIcon, setIconFile)}
                      />
                      {icon && (
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
                    <Select value={iconShape} onValueChange={setIconShape}>
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
                    <span className="text-sm font-semibold text-primary">{iconSize}px</span>
                  </div>
                  <Slider value={[iconSize]} onValueChange={(val) => setIconSize(val[0])} min={20} max={100} step={5} />
                </div>

                {/* Icon Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium block mb-2">Icon Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={`icon-color-${color.name}`}
                          onClick={() => setIconColor(color.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            iconColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium block mb-2">Background</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={`icon-bg-${color.name}`}
                          onClick={() => setIconBgColor(color.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            iconBgColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                          type="button"
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
                  <Select value={iconBorder} onValueChange={setIconBorder}>
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
                </div>

                {/* Icon Preview */}
                {renderImagePreview(icon, iconSize, iconBgColor, iconBorder, iconShape, handleRemoveIcon)}
              </div>
            </SettingsSection>

            {/* Avatar Settings */}
            <SettingsSection title="Avatar">
              <div className="space-y-4">
                {/* Upload & Border */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium mb-2">Upload Avatar</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-muted-foreground bg-transparent"
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {avatar ? "Change Avatar" : "Upload Avatar"}
                      </Button>
                      <input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setAvatar, setAvatarFile)}
                      />
                      {avatar && (
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
                    <Select value={avatarBorder} onValueChange={setAvatarBorder}>
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
                  </div>
                </div>

                {/* Avatar Size */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="font-medium">Size</Label>
                    <span className="text-sm font-semibold text-primary">{avatarSize}px</span>
                  </div>
                  <Slider
                    value={[avatarSize]}
                    onValueChange={(val) => setAvatarSize(val[0])}
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
                          onClick={() => setAvatarColor(color.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            avatarColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium block mb-2">Background</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={`avatar-bg-${color.name}`}
                          onClick={() => setAvatarBgColor(color.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            avatarBgColor === color.name ? "border-foreground ring-2 ring-offset-1" : "border-border"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Avatar Preview */}
                {renderImagePreview(avatar, avatarSize, avatarBgColor, avatarBorder, "round", handleRemoveAvatar)}
              </div>
            </SettingsSection>

            {/* Behavior Settings */}
            <SettingsSection title="Behavior">
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition">
                <Checkbox
                  checked={popupOnload}
                  onCheckedChange={(checked) => setPopupOnload(checked as boolean)}
                  className="mt-1"
                />
                <span className="text-sm leading-relaxed">
                  <div className="font-medium">Auto-open on page load</div>
                  <div className="text-xs text-muted-foreground">Opens chatbot popup automatically (desktop only)</div>
                </span>
              </label>
            </SettingsSection>

            {/* Save Button */}
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-6 font-semibold"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="hidden lg:flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-white">
          <Chat
            id={chatbotId}
            avatar={avatar}
            icon={icon}
            iconShape={iconShape}
            iconSize={iconSize}
            iconColor={iconColor}
            iconBgColor={iconBgColor}
            iconBorder={iconBorder}
            avatarSize={avatarSize}
            avatarColor={avatarColor}
            avatarBgColor={avatarBgColor}
            avatarBorder={avatarBorder}
            theme={theme}
            showPreviewControls={true}
          />
        </div>
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
    <div className="space-y-3 pb-4 border-b border-border">
      <div className="flex items-center space-x-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="font-bold text-foreground text-base">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}