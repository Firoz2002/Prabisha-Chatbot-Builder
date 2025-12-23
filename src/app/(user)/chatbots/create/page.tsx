"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Sparkles } from "lucide-react"

export default function CreateChatbotPage() {
  const [chatbotName, setChatbotName] = useState("")
  const [selectedOption, setSelectedOption] = useState<"scratch" | "ai" | null>(null)

  const handleCreate = () => {
    if (!chatbotName || !selectedOption) return
    console.log(`Creating chatbot: ${chatbotName} with option: ${selectedOption}`)
    // Handle creation logic here
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create from scratch card */}
          <button
            onClick={() => setSelectedOption("scratch")}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              selectedOption === "scratch"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-border bg-card hover:border-blue-300"
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              <Plus className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <h3 className="text-lg font-semibold text-blue-600">Create from scratch</h3>
            </div>
            <p className="text-sm text-foreground/70">
              Start with a blank slate and build your Chatbot from the ground up.
            </p>
          </button>

          {/* Create with AI card */}
          <button
            onClick={() => setSelectedOption("ai")}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              selectedOption === "ai"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-border bg-card hover:border-blue-300"
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
              <h3 className="text-lg font-semibold text-foreground">Create with AI</h3>
            </div>
            <p className="text-sm text-foreground/70">
              Let AI do the heavy lifting—start building a personalized Chatbot based on your website.
            </p>
          </button>
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name</label>
          <Input
            placeholder="New Chatbot"
            value={chatbotName}
            onChange={(e) => setChatbotName(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-10 bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
          >
            Cancel
          </Button>
          <Button
            className="h-10 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={handleCreate}
            disabled={!chatbotName || !selectedOption}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
