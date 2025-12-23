"use client"

import { toast } from "sonner"
import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Info, RefreshCw, Monitor, Smartphone, Send, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InstructionsPage() {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "How can I help you today?" }
  ]);
  const [greeting, setGreeting] = useState("How can I help you today?");
  const [directive, setDirective] = useState(`
    # Objective: You are an exceptional customer support representative. Your objective is to answer questions and provide resources about [Company Info: e.g., name and brief description of business or project]. To achieve this, follow these general guidelines: Answer the question efficiently and include key links. If a question is not clear, ask follow-up questions.
    # Style: Your communication style should be friendly and professional. Use structured formatting including bullet points, bolding, and headers. Add emojis to make messages more engaging.
    # Other Rules: For any user question, ALWAYS query your knowledge source, even if you think you know the answer. Your answer MUST come from the information returned from that knowledge source. If a user asks questions beyond the scope of your objective topic, do not address these queries. Instead, kindly redirect to something you can help them with instead.
  `);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingGreeting, setIsGeneratingGreeting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    
    // Add user message to chat
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: userMessage,
          prompt: directive,
          messages: newMessages.slice(0, -1), // Send previous messages for context
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      // Add assistant response to chat
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || data.message || "I'm sorry, I couldn't process that request." 
      }]);
      
    } catch (error) {
      console.error("Error while sending message:", error);
      toast.error("Failed to send message. Please try again.");
      
      // Optionally add error message to chat
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateGreeting = async () => {
    setIsGeneratingGreeting(true);
    try {
      // Simulate AI greeting generation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Example AI-generated greetings
      const aiGreetings = [
        "Hello! 👋 I'm your AI assistant. How can I make your day better?",
        "Welcome! I'm here to help you with any questions you might have. What can I assist you with today?",
        "Hi there! 😊 Ready to help you find answers and solutions. What's on your mind?",
        "Greetings! I'm your friendly AI assistant, excited to help you today!"
      ];
      
      const randomGreeting = aiGreetings[Math.floor(Math.random() * aiGreetings.length)];
      setGreeting(randomGreeting);
      toast.success("Greeting generated successfully!");
    } catch (error) {
      toast.error("Failed to generate greeting");
    } finally {
      setIsGeneratingGreeting(false);
    }
  };

  const handleRestartChat = () => {
    setMessages([{ role: "assistant", content: greeting }]);
    toast.info("Chat restarted");
  };

  const handleSaveChanges = () => {
    // Update the initial greeting in the chat if it's the first message
    if (messages.length === 1 && messages[0].role === "assistant") {
      setMessages([{ role: "assistant", content: greeting }]);
    }
    
    // In a real app, you would save to backend here
    toast.success("Changes saved successfully!");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Instructions */}
      <div className="w-full lg:w-1/2 bg-[#f8f6f3] border-r border-[#e5e2dd] overflow-y-auto no-scrollbar">
        <div className="p-8 max-h-screen">
          <h1 className="text-2xl font-semibold mb-8">Instructions</h1>

          {/* Greeting Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="greeting" className="text-sm font-medium">
                Greeting
              </Label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <Textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="min-h-[100px] bg-white border-[#d4d0ca] resize-none"
              placeholder="Enter greeting message..."
            />
          </div>

          {/* Directive Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="directive" className="text-sm font-medium">
                Directive
              </Label>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <Textarea
              id="directive"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              className="min-h-[280px] bg-white border-[#d4d0ca] font-mono text-sm resize-none"
              placeholder="Enter directive instructions..."
            />
          </div>

          {/* Save Button */}
          <Button 
            size="lg" 
            className="w-full bg-[#d4d0ca] hover:bg-[#c4bfb8] text-[#6b665f] mb-6"
            onClick={handleSaveChanges}
          >
            Save changes
          </Button>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="hidden lg:block w-1/2 bg-[#f0f4f8]">
        <div className="h-full flex flex-col">
          {/* Preview Header */}
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

          {/* Chat Preview Area */}
          <div 
            ref={chatAreaRef}
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-3">Test</p>
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
                  <p className="text-sm">{msg.content}</p>
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
      </div>
    </div>
  )
}