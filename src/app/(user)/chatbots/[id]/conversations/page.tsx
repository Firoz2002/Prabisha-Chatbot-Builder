"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { 
  MessageSquare, 
  User, 
  Bot, 
  Calendar, 
  Clock, 
  Search,
  ChevronRight,
  MoreVertical,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface Conversation {
  id: string;
  title: string | null;
  chatbotId: string;
  userId: string | null;
  isActive: boolean;
  metadata: any;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

interface Message {
  id: string;
  content: string;
  senderType: 'USER' | 'BOT';
  createdAt: string;
  conversationId: string;
}

export default function ConversationsPage() {
  const params = useParams()
  const chatbotId = params.id as string

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [chatbotId])

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
    } else {
      setMessages([])
    }
  }, [selectedId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/conversations`)
      const data = await res.json()
      setConversations(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (convId: string) => {
    setMessagesLoading(true)
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/conversations/${convId}`)
      const data = await res.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conv => 
    (conv.title || 'Untitled Conversation').toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConversation = conversations.find(c => c.id === selectedId)

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Left Column: Conversation List */}
      <div className="w-80 border-r flex flex-col h-full bg-muted/10">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversations
            </h2>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 group flex flex-col gap-1 ${
                    selectedId === conv.id 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold truncate text-sm">
                      {conv.title || `Conv #${conv.id.slice(-4)}`}
                    </span>
                    <span className={`text-[10px] ${selectedId === conv.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(conv.updatedAt), 'MMM d, p')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${selectedId === conv.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {conv._count.messages} messages
                    </span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                    <span className={`text-xs truncate ${selectedId === conv.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {conv.isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-4 text-center">
              <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Column: Message View */}
      <div className="flex-1 flex flex-col h-full relative bg-background">
        {selectedId ? (
          <>
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {selectedConversation?.title || 'Conversation Detail'}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Started {selectedConversation && format(new Date(selectedConversation.createdAt), 'PPP')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 px-6" scrollHideDelay={0}>
                <div className="py-8 space-y-6 max-w-4xl mx-auto" ref={scrollRef}>
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading messages...</p>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex gap-4 ${msg.senderType === 'USER' ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className={`h-8 w-8 mt-1 border shrink-0 ${msg.senderType === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {msg.senderType === 'USER' ? (
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          ) : (
                            <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                          )}
                        </Avatar>
                        <div className={`flex flex-col gap-1 max-w-[80%] ${msg.senderType === 'USER' ? 'items-end' : ''}`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            msg.senderType === 'USER' 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-muted/50 border rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1">
                            {format(new Date(msg.createdAt), 'p')}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <p>No messages in this conversation</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Select a conversation</h3>
            <p className="text-sm text-center max-w-xs mt-1">
              Choose a conversation from the left to view the messages and details.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
