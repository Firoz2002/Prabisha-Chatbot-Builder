"use client"

import { toast } from "sonner"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { List, Link2, Calendar } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { LinkButtonForm } from "@/components/forms/link-button-form";
import { CollectLeadsForm } from "@/components/forms/collect-leads-form";
import { ScheduleMeetingForm } from "@/components/forms/schedule-meeting-form";

import { ChatbotLogic } from "@/types/chatbot-logic"

interface Feature {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
}

const safeJsonParse = (data: any, fallback: any = null) => {
  if (!data) return fallback;
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

export default function LogicPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.id as string;
  const [activeTab, setActiveTab] = useState("features")
  const [isLoading, setIsLoading] = useState(false)
  const [existingLogic, setExistingLogic] = useState<ChatbotLogic | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)

  // Fetch existing logic when component mounts
  useEffect(() => {
    fetchExistingLogic()
  }, [chatbotId])

  const fetchExistingLogic = async () => {
    try {
      const response = await fetch(`/api/chatbots/${chatbotId}/logic`)
      if (!response.ok) throw new Error('Failed to fetch logic')
      const data = await response.json()
      setExistingLogic(data.logic || null)
    } catch (error) {
      console.error('Error fetching logic:', error)
      toast.error('Failed to load logic configuration')
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

  const handleSaveLogic = async (logicData: Partial<ChatbotLogic>, formData?: any) => {
    setIsLoading(true)
    try {
      // Get existing logic first
      const existingResponse = await fetch(`/api/chatbots/${chatbotId}/logic`)
      let currentLogic: ChatbotLogic = existingLogic || {
        chatbotId,
        name: "Chatbot Logic",
        description: "Logic configuration for this chatbot",
        isActive: true,
        leadCollectionEnabled: false,
        linkButtonEnabled: false,
        meetingScheduleEnabled: false,
        triggers: []
      }

      if (existingResponse.ok) {
        const data = await existingResponse.json()
        if (data.logic) {
          currentLogic = data.logic
        }
      }

      // Update the specific feature configuration based on which feature is being saved
      const updatedLogic: ChatbotLogic = {
        ...currentLogic,
        chatbotId,
        ...logicData
      }

      // Add form-specific data if provided
      if (formData) {
        if (selectedFeature === "collect-leads") {
          updatedLogic.leadCollectionConfig = formData
          updatedLogic.leadCollectionEnabled = true
        } else if (selectedFeature === "link-button") {
          updatedLogic.linkButtonConfig = formData
          updatedLogic.linkButtonEnabled = true
        } else if (selectedFeature === "schedule-meeting") {
          updatedLogic.meetingScheduleConfig = formData
          updatedLogic.meetingScheduleEnabled = true
        }
      }

      const method = updatedLogic.id ? 'PUT' : 'POST'
      const url = updatedLogic.id 
        ? `/api/chatbots/${chatbotId}/logic/${updatedLogic.id}`
        : `/api/chatbots/${chatbotId}/logic`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLogic),
      })

      if (!response.ok) {
        throw new Error('Failed to save logic')
      }

      const data = await response.json()
      toast.success(updatedLogic.id ? 'Logic updated successfully!' : 'Logic configuration saved successfully!')
      await fetchExistingLogic() // Refresh the logic
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

  const handleDeleteFeature = async (featureType: string) => {
    if (!confirm('Are you sure you want to delete this feature configuration?')) return

    try {
      const updatedLogic: ChatbotLogic = {
        ...(existingLogic || {
          chatbotId,
          name: "Chatbot Logic",
          description: "Logic configuration for this chatbot",
          isActive: true,
          triggers: []
        })
      }

      // Disable the specific feature
      if (featureType === "collect-leads") {
        updatedLogic.leadCollectionEnabled = false
        updatedLogic.leadCollectionConfig = undefined
      } else if (featureType === "link-button") {
        updatedLogic.linkButtonEnabled = false
        updatedLogic.linkButtonConfig = undefined
      } else if (featureType === "schedule-meeting") {
        updatedLogic.meetingScheduleEnabled = false
        updatedLogic.meetingScheduleConfig = undefined
      }

      // Remove any triggers associated with this feature
      if (updatedLogic.triggers) {
        updatedLogic.triggers = updatedLogic.triggers.filter(trigger => 
          !trigger.keywords?.includes(`${featureType}-trigger`)
        )
      }

      const response = await fetch(`/api/chatbots/${chatbotId}/logic${existingLogic?.id ? `/${existingLogic.id}` : ''}`, {
        method: existingLogic?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLogic),
      })

      if (!response.ok) {
        throw new Error('Failed to delete feature')
      }

      toast.success('Feature configuration deleted successfully!')
      await fetchExistingLogic() // Refresh the logic
    } catch (error) {
      console.error('Error deleting feature:', error)
      toast.error('Failed to delete feature configuration')
    }
  }

  const getFeatureConfig = (featureId: string): any => {
    if (!existingLogic) return undefined

    switch (featureId) {
      case "collect-leads":
        if (existingLogic.leadCollectionEnabled && existingLogic.leadCollectionConfig) {
          return safeJsonParse(existingLogic.leadCollectionConfig)
        }
        break
      case "link-button":
        if (existingLogic.linkButtonEnabled && existingLogic.linkButtonConfig) {
          return safeJsonParse(existingLogic.linkButtonConfig)
        }
        break
      case "schedule-meeting":
        if (existingLogic.meetingScheduleEnabled && existingLogic.meetingScheduleConfig) {
          return safeJsonParse(existingLogic.meetingScheduleConfig)
        }
        break
    }
    return undefined
  }

  const resetForm = () => {
    setSelectedFeature(null)
    setActiveTab("features")
  }

  return (
    <div className="space-y-6">
      {/* Add New Logic Section */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="features" className="space-y-8">
            {/* Features List */}
            <div className="flex flex-col gap-2">
              {features.map((feature) => {
                const isEnabled = 
                  (feature.id === "collect-leads" && existingLogic?.leadCollectionEnabled) ||
                  (feature.id === "link-button" && existingLogic?.linkButtonEnabled) ||
                  (feature.id === "schedule-meeting" && existingLogic?.meetingScheduleEnabled)

                return (
                  <Card
                    key={feature.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-card"
                    onClick={() => {
                      setSelectedFeature(feature.id)
                      setActiveTab(feature.id)
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-foreground">{feature.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                            {isEnabled && (
                              <Badge 
                                variant="outline" 
                                className="text-xs h-5 bg-green-50 text-green-700 border-green-200"
                              >
                                Configured
                              </Badge>
                            )}
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
                      {isEnabled && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFeature(feature.id)
                            }}
                            className="text-xs text-red-600 hover:text-red-800 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
          
          {/* Feature-specific Tabs */}
          {features.map((feature) => (
            <TabsContent key={feature.id} value={feature.id} className="space-y-8">
              {feature.id === "collect-leads" && (
                <CollectLeadsForm 
                  onBack={resetForm} 
                  onSave={(data) => handleSaveLogic({}, data)}
                  isLoading={isLoading}
                  initial={getFeatureConfig(feature.id)}
                />
              )}
              {feature.id === "link-button" && (
                <LinkButtonForm 
                  onBack={resetForm} 
                  onSave={(data) => handleSaveLogic({}, data)}
                  isLoading={isLoading}
                  initial={getFeatureConfig(feature.id)}
                />
              )}
              {feature.id === "schedule-meeting" && (
                <ScheduleMeetingForm 
                  onBack={resetForm} 
                  onSave={(data) => handleSaveLogic({}, data)}
                  isLoading={isLoading}
                  initial={getFeatureConfig(feature.id)}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}