// hooks/useChatbot.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types/chat';

interface ChatbotData {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  icon?: string;
  greeting?: string;
  suggestions?: string[];
  workspace?: {
    logo?: string;
    name?: string;
  };
  [key: string]: any; // Additional chatbot properties
}

interface UseChatbotProps {
  chatbotId: string;
  initialChatbotData?: ChatbotData;
}

interface UseChatbotReturn {
  // Chatbot data
  chatbot: ChatbotData | null;
  isLoadingChatbot: boolean;
  chatbotError: string | null;
  
  // Chat state
  text: string;
  setText: (text: string) => void;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  isCheckingSession: boolean;
  conversationId: string | null;
  hasLoadedInitialMessages: boolean;
  quickQuestions: string[];
  
  // Methods
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleQuickQuestion: (question: string) => Promise<void>;
  handleNewChat: () => Promise<void>;
  formatTime: (date?: Date) => string;
  refetchChatbot: () => Promise<void>;
  
  // Refs
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useChatbot({ chatbotId, initialChatbotData }: UseChatbotProps): UseChatbotReturn {
  // Chatbot data state
  const [chatbot, setChatbot] = useState<ChatbotData | null>(initialChatbotData || null);
  const [isLoadingChatbot, setIsLoadingChatbot] = useState(!initialChatbotData);
  const [chatbotError, setChatbotError] = useState<string | null>(null);

  // Chat state (from original useChat)
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState<boolean>(false);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch chatbot data
  const fetchChatbotData = useCallback(async () => {
    if (!chatbotId) return;
    
    setIsLoadingChatbot(true);
    setChatbotError(null);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/chatbots/${chatbotId}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chatbot: ${response.status}`);
      }
      
      const data = await response.json();
      setChatbot(data);
      
      // Set quick questions from chatbot config
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setQuickQuestions(data.suggestions);
      } else {
        // Fallback default questions
        setQuickQuestions([
          "How can you help me?",
          "What are your features?",
          "Tell me about pricing",
          "How do I get started?",
        ]);
      }
    } catch (error) {
      console.error('Error fetching chatbot:', error);
      setChatbotError(error instanceof Error ? error.message : 'Failed to load chatbot');
    } finally {
      setIsLoadingChatbot(false);
    }
  }, [chatbotId]);

  // Initialize - fetch chatbot if not provided
  useEffect(() => {
    if (!initialChatbotData && chatbotId) {
      fetchChatbotData();
    } else if (initialChatbotData) {
      setChatbot(initialChatbotData);
      if (initialChatbotData.suggestions) {
        setQuickQuestions(initialChatbotData.suggestions);
      }
      setIsLoadingChatbot(false);
    }
  }, [chatbotId, initialChatbotData, fetchChatbotData]);

  // Initialize chat session
  useEffect(() => {
    if (!chatbotId || !chatbot) return;

    const initializeChat = async () => {
      try {
        const savedConversationId = localStorage.getItem(`chatbot_${chatbotId}_conversation`);
        
        if (savedConversationId) {
          setConversationId(savedConversationId);
          await loadConversationMessages(savedConversationId);
        } else {
          await createNewConversation();
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        // Show welcome message even if initialization fails
        const welcomeMessage: ChatMessage = {
          role: 'bot',
          content: chatbot.greeting || "👋 Hello! How can I help you today?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setHasLoadedInitialMessages(true);
      } finally {
        setIsCheckingSession(false);
      }
    };

    initializeChat();
  }, [chatbotId, chatbot]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (hasLoadedInitialMessages) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [messages, loading, hasLoadedInitialMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (inputRef.current && hasLoadedInitialMessages) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [hasLoadedInitialMessages]);

  // Load conversation messages
  const loadConversationMessages = async (conversationId: string) => {
    if(!conversationId) return;
    
    try {
      const response = await fetch(`/api/chat/${conversationId}?chatbotId=${chatbotId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 404) {
        console.log('Conversation not found, creating new one');
        localStorage.removeItem(`chatbot_${chatbotId}_conversation`);
        await createNewConversation();
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const formattedMessages = data.data.map((msg: any) => ({
            role: msg.senderType === 'BOT' ? 'bot' as const : 'user' as const,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
          }));
          
          if (formattedMessages.length > 0) {
            setMessages(formattedMessages);
          }
          setHasLoadedInitialMessages(true);
        }
      } else {
        throw new Error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      localStorage.removeItem(`chatbot_${chatbotId}_conversation`);
      setConversationId(null);
      setHasLoadedInitialMessages(true);
    }
  };

  // Create new conversation
  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/chat/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatbotId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
        localStorage.setItem(`chatbot_${chatbotId}_conversation`, data.id);
        
        const welcomeMessage: ChatMessage = {
          role: 'bot',
          content: chatbot?.greeting || "👋 Hello! How can I help you today?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setHasLoadedInitialMessages(true);
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  // Save message to database
  const saveMessage = async (content: string, senderType: 'USER' | 'BOT') => {
    if (!conversationId) return null;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          senderType,
          conversationId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchQuery = text.trim();
    if (!searchQuery) {
      setError('Please enter a message');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = { 
      role: 'user', 
      content: searchQuery,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    await saveMessage(searchQuery, 'USER');
    
    setLoading(true);
    setStatus('submitted');
    setError('');
    setText('');
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    try {
      const requestData = {
        message: searchQuery,
        conversationId,
        chatbotId,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setStatus('streaming');
      
      const assistantMessage: ChatMessage = {
        role: 'bot',
        content: data.message || data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      await saveMessage(assistantMessage.content, 'BOT');

      setTimeout(() => {
        setStatus('ready');
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Chat error:', error);
      setStatus('error');
      setLoading(false);
      
      const errorMessage: ChatMessage = {
        role: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      await saveMessage(errorMessage.content, 'BOT');
      
      setError(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
      
      setTimeout(() => {
        setStatus('ready');
      }, 3000);
    }
  };

  // Handle quick question
  const handleQuickQuestion = async (question: string) => {
    if (loading) return;
    
    setText(question);
    
    const fakeEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>;
    
    await handleSubmit(fakeEvent);
  };

  // Handle new chat
  const handleNewChat = async () => {
    try {
      if (conversationId) {
        await fetch(`/api/chat/${conversationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: false })
        });
        
        localStorage.removeItem(`chatbot_${chatbotId}_conversation`);
      }
      
      setConversationId(null);
      setText('');
      setError('');
      setStatus('ready');
      setMessages([]);
      
      await createNewConversation();
      
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error creating new chat:', error);
      setError('Failed to start new chat. Please try again.');
    }
  };

  // Format time helper
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Refetch chatbot data
  const refetchChatbot = async () => {
    await fetchChatbotData();
  };

  return {
    // Chatbot data
    chatbot,
    isLoadingChatbot,
    chatbotError,
    
    // Chat state
    text,
    setText,
    status,
    messages,
    loading,
    error,
    isCheckingSession,
    conversationId,
    hasLoadedInitialMessages,
    quickQuestions,
    
    // Methods
    handleSubmit,
    handleQuickQuestion,
    handleNewChat,
    formatTime,
    refetchChatbot,
    
    // Refs
    messagesEndRef,
    inputRef,
    chatContainerRef,
  };
}