"use client"

import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, Info, Loader2, Sparkles } from "lucide-react"
import { useChatbot } from "@/providers/chatbot-provider"

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InstructionsPage() {
  const { config, updateConfig, refreshConfig } = useChatbot();
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: config.greeting }
  ])

  // Initialize local state from context
  const [name, setName] = useState(config.name || "");
  const [directive, setDirective] = useState(config.directive || "");
  const [greeting, setGreeting] = useState(config.greeting || "How can I help you today?");

  // Sync local state when config changes
  useEffect(() => {
    setName(config.name || "");
    setGreeting(config.greeting || "How can I help you today?");
    setDirective(config.directive || "");
    setMessages([{ role: "assistant", content: config.greeting || "How can I help you today?" }]);
  }, [config]);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const updates = {
        name,
        greeting,
        directive
      };

      // Update local context immediately for better UX
      updateConfig(updates);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("greeting", greeting);
      formData.append("directive", directive);

      const response = await fetch(`/api/chatbots/${config.id}`, {
        method: "PUT",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Refresh config from server to ensure consistency
      await refreshConfig();
      
      toast.success("Changes saved successfully!");
      
      // Update chat messages with new greeting
      if (messages.length === 1 && messages[0].role === "assistant") {
        setMessages([{ role: "assistant", content: greeting }]);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
      // Optionally revert context update on error
    } finally {
      setIsLoading(false);
    }
  }

  // If config is still loading, show loading state
  if (!config.id) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Name Section */}
      <div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Chatbot Name
              </Label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <Textarea
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              updateConfig({ name: e.target.value });
            }}
            className="min-h-10 resize-none"
            placeholder="Enter your chatbot name..."
            rows={1}
          />
        </div>
      </div>

      {/* Greeting Section */}
      <div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="greeting" className="text-sm font-medium">
                Greeting Message
              </Label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <Textarea
            id="greeting"
            value={greeting}
            onChange={(e) => {
              setGreeting(e.target.value);
              updateConfig({ greeting: e.target.value });
            }}
            className="min-h-30 resize-none"
            placeholder="How can I help you today?"
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-2">
            This is the first message users will see when they open the chatbot
          </p>
        </div>
      </div>

      {/* Directive Section */}
      <div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="directive" className="text-sm font-medium">
                Instructions & Personality
              </Label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <Textarea
            id="directive"
            value={directive}
            onChange={(e) => {
              setDirective(e.target.value);
              updateConfig({ directive: e.target.value });
            }}
            className="min-h-[280px] font-mono text-sm resize-none"
            placeholder={`Example: You are a helpful customer support assistant for an e-commerce store. 
- Always be polite and professional
- Keep responses concise
- If you don't know something, offer to connect with a human agent
- Never share internal company information`}
            rows={12}
          />
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p>Define your chatbot's personality, behavior, and instructions.</p>
            <p>Be specific about tone, response length, and limitations.</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t">
        <Button
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}