"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RefreshCw, Monitor, Smartphone, Send, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatProps {
  initialMessages?: Message[]
  initialGreeting?: string
  directive?: string
  onSendMessage?: (message: string, messages: Message[]) => Promise<string | void>
  showPreviewControls?: boolean
}

export default function Chat({
  initialMessages = [{ role: "assistant", content: "How can I help you today?" }],
  initialGreeting = "How can I help you today?",
  directive = "",
  onSendMessage,
  showPreviewControls = false,
}: ChatProps) {
  const [message, setMessage] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatAreaRef = useRef<HTMLDivElement>(null)

  // Initialize messages with greeting
  useEffect(() => {
    if (initialGreeting && messages.length === 1 && messages[0].role === "assistant") {
      setMessages([{ role: "assistant", content: initialGreeting }])
    }
  }, [initialGreeting])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage("")
    
    // Add user message to chat
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    
    setIsLoading(true)

    try {
      if (onSendMessage) {
        // Use custom message handler if provided
        const response = await onSendMessage(userMessage, newMessages.slice(0, -1))
        if (response) {
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: response
          }])
        }
      } else {
        // Default behavior - call API
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: userMessage,
            prompt: directive,
            messages: newMessages.slice(0, -1),
          }),
        })

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data = await res.json()
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.response || data.message || "I'm sorry, I couldn't process that request." 
        }])
      }
      
    } catch (error) {
      console.error("Error while sending message:", error)
      
      // Add error message to chat
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestartChat = () => {
    setMessages([{ role: "assistant", content: initialGreeting }])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header - Only show when preview controls are enabled */}
      {showPreviewControls && (
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#e5e8ec]">
          <h2 className="text-lg font-semibold">Preview</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm"
              onClick={handleRestartChat}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart Chat
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9">
              <Monitor className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9">
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div 
        ref={chatAreaRef}
        className="flex-1 overflow-y-auto p-6"
      >
        {/* Greeting/Initial Message */}
        <div className="mb-4">
          {showPreviewControls && (
            <p className="text-xs text-muted-foreground mb-3">Test</p>
          )}
          <Card className="bg-white p-4 max-w-md border-[#e5e8ec]">
            <p className="text-sm">{messages[0]?.content}</p>
          </Card>
        </div>

        {/* Display all messages */}
        {messages.slice(1).map((msg, index) => (
          <div 
            key={index} 
            className={`mb-4 ${msg.role === "user" ? "flex justify-end" : ""}`}
          >
            <Card className={`p-4 max-w-md border-[#e5e8ec] ${
              msg.role === "user" 
                ? "bg-indigo-600 text-white" 
                : "bg-white"
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </Card>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-4">
            <Card className="bg-white p-4 max-w-md border-[#e5e8ec]">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Thinking...</p>
              </div>
            </Card>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-6 bg-white border-t border-[#e5e8ec]">
        <div className="flex items-center gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything"
            className="flex-1 bg-white border-[#d4d0ca]"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="shrink-0"
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}