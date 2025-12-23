"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ChevronDown, Upload, Zap, Palette, Check } from "lucide-react"
import Chat from "@/components/features/chat"

export default function ThemePage() {
  const [avatar, setAvatar] = useState<string | null>(null)
  const [useAvatarFavicon, setUseAvatarFavicon] = useState(true)
  const [logo, setLogo] = useState<string | null>(null)
  const [icon, setIcon] = useState<string | null>(null)
  const [iconShape, setIconShape] = useState("circle")
  const [iconSize, setIconSize] = useState(50)
  const [selectedColor, setSelectedColor] = useState("blue")
  const [borderRadius, setBorderRadius] = useState("regular")
  const [theme, setTheme] = useState("light")
  const [autoOpenChat, setAutoOpenChat] = useState(false)
  const [autoGreeting, setAutoGreeting] = useState(false)

  const colors = [
    { name: "blue", label: "Default", value: "#3b82f6" },
    { name: "black", label: "Black", value: "#000000" },
    { name: "purple", label: "Purple", value: "#a855f7" },
    { name: "green", label: "Green", value: "#16a34a" },
    { name: "red", label: "Red", value: "#dc2626" },
    { name: "orange", label: "Orange", value: "#ea580c" },
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setter(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-screen">
        {/* Left Panel - Settings */}
        <div className="overflow-y-auto border-r border-border bg-card">
          <div className="p-6 space-y-6 max-w-lg">
            {/* Theme Section */}
            <SettingsSection title="Theme">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Avatar</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground bg-transparent"
                    onClick={() => document.getElementById("avatar-upload")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose image
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setAvatar)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox checked={useAvatarFavicon} onCheckedChange={setUseAvatarFavicon} />
                    <span className="text-sm font-medium">Use Avatar As Favicon</span>
                  </label>
                </div>
              </div>
            </SettingsSection>

            {/* Pro Feature Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Pro feature expires in 14 days</span>
              </div>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Upgrade
              </Button>
            </div>

            {/* Embed Logo Section */}
            <SettingsSection title="Embed Logo" subtitle="Logo">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground bg-transparent"
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose image
              </Button>
              <input id="logo-upload" type="file" className="hidden" onChange={(e) => handleImageUpload(e, setLogo)} />
            </SettingsSection>

            {/* Embed Icon Section */}
            <SettingsSection title="Embed Icon" subtitle="Icon">
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground bg-transparent"
                  onClick={() => document.getElementById("icon-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose image
                </Button>
                <input
                  id="icon-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setIcon)}
                />

                {/* Preview */}
                <div className="border border-border rounded-lg p-4 bg-background">
                  <div className="text-xs font-medium text-muted-foreground mb-3">Preview</div>
                  <div className="flex justify-center items-center py-6 bg-muted rounded-lg">
                    <div
                      className={`rounded-full w-${iconSize} h-${iconSize} bg-blue-500 flex items-center justify-center text-white`}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12h-4v4h-4v-4H4V4h16v10z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Shape */}
                <div>
                  <label className="block text-sm font-medium mb-2">Shape</label>
                  <Select value={iconShape} onValueChange={setIconShape}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="rounded">Rounded Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Size Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Size</label>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                      Reset to default
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[iconSize]}
                      onValueChange={(val) => setIconSize(val[0])}
                      min={30}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Smaller</span>
                      <span className="font-medium">{iconSize}px</span>
                      <span>Larger</span>
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <Checkbox checked={autoOpenChat} onCheckedChange={setAutoOpenChat} className="mt-1" />
                    <span className="text-sm">Automatically open Chatbot pop-up when page loads (non-mobile only)</span>
                  </label>
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <Checkbox checked={autoGreeting} onCheckedChange={setAutoGreeting} className="mt-1" />
                    <span className="text-sm">Automatically display your greeting message after a few seconds</span>
                  </label>
                </div>
              </div>
            </SettingsSection>

            {/* Pro Feature Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Pro feature expires in 14 days</span>
              </div>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Upgrade
              </Button>
            </div>

            {/* Appearance Section */}
            <SettingsSection title="Appearance">
              <div className="space-y-4 text-sm text-muted-foreground mb-4">
                Choose a pre-made Zapier theme, add your own brand color, or create your own custom theme.
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {colors.map((color) => (
                    <ColorSelector
                      key={color.name}
                      color={color}
                      selected={selectedColor === color.name}
                      onSelect={() => setSelectedColor(color.name)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-2">Custom color</label>
                <Button variant="outline" className="w-full justify-start text-muted-foreground bg-transparent">
                  <Palette className="w-4 h-4 mr-2" />
                  Add custom color
                </Button>
              </div>
            </SettingsSection>

            {/* App Style Section */}
            <SettingsSection title="App style">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Border roundness</label>
                  <Select value={borderRadius} onValueChange={setBorderRadius}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="very-rounded">Very Rounded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light (default)</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingsSection>

            {/* Advanced Color Settings */}
            <div className="border border-border rounded-lg">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors">
                <span className="font-medium">Advanced color settings</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-4">
              <Button variant="outline" className="bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-foreground">
                Cancel
              </Button>
              <Button className="bg-yellow-50 border border-yellow-300 text-foreground hover:bg-yellow-100">
                Save changes
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="hidden lg:flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-white p-6">
          <Chat />
        </div>
      </div>
    </div>
  )
}

interface SettingsSectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

function SettingsSection({ title, subtitle, children }: SettingsSectionProps) {
  return (
    <div>
      <div className="flex items-center space-x-1 mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">({subtitle})</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}


interface ColorOption {
  name: string
  label: string
  value: string
}

interface ColorSelectorProps {
  color: ColorOption
  selected: boolean
  onSelect: () => void
}

function ColorSelector({ color, selected, onSelect }: ColorSelectorProps) {
  return (
    <Button
      onClick={onSelect}
      variant="outline"
      className={`w-full h-12 justify-start space-x-3 border-2 transition-all ${
        selected ? "border-foreground bg-muted" : "border-border"
      }`}
    >
      <div
        className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
        style={{ backgroundColor: color.value }}
      />
      <span className="text-sm font-medium flex-1 text-left">{color.label}</span>
      {selected && <Check className="w-4 h-4 text-foreground flex-shrink-0" />}
    </Button>
  )
}
