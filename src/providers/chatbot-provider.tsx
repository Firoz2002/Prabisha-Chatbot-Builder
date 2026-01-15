// contexts/chatbot-context.tsx
"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ChatbotConfig {
  id: string;
  name: string;
  greeting: string;
  directive: string;
  theme: 'light' | 'dark';
  avatar: string | null;
  avatarSize: number;
  avatarColor: string;
  avatarBorder: string;
  avatarBgColor: string;
  icon: string | null;
  iconSize: number;
  iconColor: string;
  iconShape: string;
  iconBorder: string;
  iconBgColor: string;
  popupOnload: boolean;
}

interface ChatbotContextType {
  config: ChatbotConfig;
  updateConfig: (updates: Partial<ChatbotConfig>) => void;
  refreshConfig: () => Promise<void>;
}

const defaultConfig: ChatbotConfig = {
  id: '',
  name: '',
  greeting: 'How can I help you today?',
  directive: '',
  theme: 'light',
  avatar: null,
  avatarSize: 50,
  avatarColor: 'blue',
  avatarBorder: 'flat',
  avatarBgColor: 'blue',
  icon: null,
  iconSize: 50,
  iconColor: 'white',
  iconShape: 'round',
  iconBorder: 'flat',
  iconBgColor: 'blue',
  popupOnload: false,
};

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ 
  children, 
  initialId 
}: { 
  children: ReactNode; 
  initialId: string;
}) {
  const [config, setConfig] = useState<ChatbotConfig>({
    ...defaultConfig,
    id: initialId,
  });

  const updateConfig = (updates: Partial<ChatbotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const refreshConfig = async () => {
    try {
      const response = await fetch(`/api/chatbots/${initialId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to refresh config:', error);
    }
  };

  return (
    <ChatbotContext.Provider value={{ config, updateConfig, refreshConfig }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}