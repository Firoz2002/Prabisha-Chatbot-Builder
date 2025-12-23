"use client"

import type React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Trash2, GripVertical, AlertCircle, Plus, Info, List, Zap, Play, Link2, Calendar, Lightbulb, Settings } from "lucide-react"
import Chat from "@/components/features/chat"

interface Feature {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
}

export default function LogicPage() {
  const [activeTab, setActiveTab] = useState("features")

  const features: Feature[] = [
    {
      id: "collect-leads",
      icon: <List className="w-5 h-5" />,
      title: "Collect leads",
      description: "Add a form to request info.",
      badge: "Pro feature",
    },
    {
      id: "zap-button",
      icon: <Zap className="w-5 h-5" />,
      title: "Zap button",
      description: "Display button that triggers a Zap.",
    },
    {
      id: "run-zap",
      icon: <Play className="w-5 h-5" />,
      title: "Run Zap",
      description: "Trigger a Zap run automatically.",
    },
    {
      id: "link-button",
      icon: <Link2 className="w-5 h-5" />,
      title: "Link button",
      description: "Display button to open a URL.",
      badge: "Pro feature",
    },
    {
      id: "schedule-meeting",
      icon: <Calendar className="w-5 h-5" />,
      title: "Schedule meeting",
      description: "Display inline calendar for scheduling",
      badge: "New",
    },
    {
      id: "suggestions",
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Suggestions",
      description: "Give users default prompts to use.",
    },
  ]

  // Custom message handler for the logic page
  const handleSendMessage = async (userMessage: string, previousMessages: any[]) => {
    // You can implement custom logic specific to the logic page here
    // For now, simulate a response
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        const responses = [
          "I've processed your logic request. What else would you like to configure?",
          "Understood! I'll apply that logic to the conversation flow.",
          "Logic feature activated. How else can I assist with your chatbot configuration?",
          "I've updated the conversation logic based on your input. Anything else you'd like to adjust?"
        ]
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        resolve(randomResponse)
      }, 800)
    })
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel with Tabs */}
      <div className="w-full lg:w-1/2 bg-[#f8f6f3] border-r border-[#e5e2dd] overflow-y-auto no-scrollbar">
        <div className="p-8 max-h-screen">
          <h1 className="text-2xl font-semibold mb-8">Logic Configuration</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="features" className="space-y-8">
              {/* Features List */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <List className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Logic Features</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Configure conversation logic and actions</p>
                
                <div className="flex flex-col gap-2">
                  {features.map((feature) => (
                    <Card
                      key={feature.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer border border-[#d4d0ca] bg-white hover:bg-white/90"
                      onClick={() => setActiveTab(feature.id)}
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
              </div>
            </TabsContent>
            
            {/* Feature-specific Tabs */}
            {features.map((feature) => (
              <TabsContent key={feature.id} value={feature.id} className="space-y-8">
                {feature.id === "collect-leads" && <CollectLeadsForm onBack={() => setActiveTab("features")} />}
                {feature.id === "zap-button" && <ZapButtonForm onBack={() => setActiveTab("features")} />}
                {feature.id === "run-zap" && <RunZapForm onBack={() => setActiveTab("features")} />}
                {feature.id === "link-button" && <LinkButtonForm onBack={() => setActiveTab("features")} />}
                {feature.id === "schedule-meeting" && <ScheduleMeetingForm onBack={() => setActiveTab("features")} />}
                {feature.id === "suggestions" && <SuggestionsForm onBack={() => setActiveTab("features")} />}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Right Panel - Chat Preview (Same as original) */}
      <div className="hidden lg:block w-1/2 bg-[#f0f4f8]">
        <div className="h-full flex flex-col">
          <div className="border-b border-[#d1d9e6] bg-white p-4">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-foreground">Chat Preview</h1>
              <div className="text-xs text-muted-foreground">
                Test your logic configuration in real-time
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <Chat
              initialGreeting="Welcome to Logic Configuration! I can help you set up logic features for your chatbot. What would you like to configure?"
              showPreviewControls={false}
              onSendMessage={handleSendMessage}
              directive={`
                # Objective: You are a logic configuration assistant for a chatbot builder. Help users configure various logic features like lead collection, Zapier integrations, scheduling, and suggestions.
                # Style: Be technical but friendly. Provide clear explanations of logic features and their implications.
                # Rules: When users ask about specific logic features, explain how they work and how to configure them. If unsure, suggest they check the feature documentation.
              `}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Existing CollectLeadsForm component remains the same
interface Field {
  id: string
  type: "text" | "email" | "phone"
  label: string
}

interface CollectLeadsFormProps {
  onBack: () => void
}

export function CollectLeadsForm({ onBack }: CollectLeadsFormProps) {
  const [fields, setFields] = useState<Field[]>([
    { id: "1", type: "text", label: "Name" },
    { id: "2", type: "email", label: "Email" },
    { id: "3", type: "phone", label: "Phone" },
    { id: "4", type: "text", label: "Company" },
  ])
  const [whenToAsk, setWhenToAsk] = useState("beginning")
  const [style, setStyle] = useState("embedded-form")
  const [cadence, setCadence] = useState("all-at-once")
  const [formTitle, setFormTitle] = useState("Let's Connect")
  const [formDesc, setFormDesc] = useState("Just a couple details so we can better assist you!")

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const updateField = (id: string, label: string) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, label } : f)))
  }

  return (
    <div className="bg-white border border-[#d4d0ca] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e5e2dd] p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Collect Leads</h2>
          <p className="text-xs text-muted-foreground">Configure lead collection form</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-5">
        {/* Fields Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Form Fields</h3>
            <Button variant="ghost" size="sm" className="text-xs text-foreground hover:bg-muted h-7 gap-1">
              <Plus className="w-3 h-3" />
              Add field
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="flex gap-2 items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 cursor-move">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Select value={field.type}>
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  className="flex-1 h-9 text-xs"
                  placeholder="Field label"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeField(field.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* When to ask */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">When to ask</label>
          <Select value={whenToAsk} onValueChange={setWhenToAsk}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginning">At the beginning of the conversation</SelectItem>
              <SelectItem value="middle">In the middle of the conversation</SelectItem>
              <SelectItem value="end">At the end of the conversation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Options */}
        <div className="space-y-3 pb-2 border-t border-[#e5e2dd] pt-4">
          <h3 className="text-xs font-medium text-foreground">Additional options</h3>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Style
              <Info className="w-3 h-3 text-muted-foreground" />
            </label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="embedded-form">Embedded Form</SelectItem>
                <SelectItem value="popup">Popup</SelectItem>
                <SelectItem value="modal">Modal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Cadence
              <Info className="w-3 h-3 text-muted-foreground" />
            </label>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-at-once">All at once (collect all details in one message)</SelectItem>
                <SelectItem value="one-by-one">One by one</SelectItem>
                <SelectItem value="grouped">Grouped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Form title
              <Info className="w-3 h-3 text-muted-foreground" />
            </label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="h-9 text-xs"
              placeholder="Form title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Form description
              <Info className="w-3 h-3 text-muted-foreground" />
            </label>
            <Input
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="h-9 text-xs"
              placeholder="Form description"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-[#e5e2dd]">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-sm bg-transparent">
              Cancel
            </Button>
            <Button className="flex-1 h-10 text-sm bg-blue-600 hover:bg-blue-700 text-white">Create logic</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dummy component stubs for other features
interface FormProps {
  onBack: () => void
}

function ZapButtonForm({ onBack }: FormProps) {
  return (
    <div className="bg-white border border-[#d4d0ca] rounded-lg overflow-hidden">
      <div className="border-b border-[#e5e2dd] p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Zap Button</h2>
          <p className="text-xs text-muted-foreground">Configure Zap button trigger</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Zap button configuration form (dummy component)</p>
      </div>
    </div>
  )
}

function RunZapForm({ onBack }: FormProps) {
  return (
    <div className="bg-white border border-[#d4d0ca] rounded-lg overflow-hidden">
      <div className="border-b border-[#e5e2dd] p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Run Zap</h2>
          <p className="text-xs text-muted-foreground">Configure automatic Zap execution</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Run Zap configuration form (dummy component)</p>
      </div>
    </div>
  )
}

function LinkButtonForm({ onBack }: FormProps) {
  return (
    <div className="bg-white border border-[#d4d0ca] rounded-lg overflow-hidden">
      <div className="border-b border-[#e5e2dd] p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Link Button</h2>
          <p className="text-xs text-muted-foreground">Configure link button settings</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Link button configuration form (dummy component)</p>
      </div>
    </div>
  )
}

function ScheduleMeetingForm({ onBack }: FormProps) {
  return (
    <div className="bg-white border border-[#d4d0ca] rounded-lg overflow-hidden">
      <div className="border-b border-[#e5e2dd] p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Schedule Meeting</h2>
          <p className="text-xs text-muted-foreground">Configure meeting scheduling</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Schedule meeting configuration form (dummy component)</p>
      </div>
    </div>
  )
}

function SuggestionsForm({ onBack }: FormProps) {
  return (
    <div className="bg-white border border-[#d4d0ca] rounded-lg overflow-hidden">
      <div className="border-b border-[#e5e2dd] p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Suggestions</h2>
          <p className="text-xs text-muted-foreground">Configure default prompts</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Suggestions configuration form (dummy component)</p>
      </div>
    </div>
  )
}