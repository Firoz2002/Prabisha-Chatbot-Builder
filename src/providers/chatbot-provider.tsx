"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Update the interface to match database field names
interface ChatbotConfig {
  id: string;
  name: string;
  greeting: string;
  directive: string;
  theme: string;
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
  popup_onload: boolean;
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
  theme: '',
  avatar: null,
  avatarSize: 50,
  avatarColor: '',
  avatarBorder: '',
  avatarBgColor: '',
  icon: null,
  iconSize: 50,
  iconColor: '',
  iconShape: '',
  iconBorder: '',
  iconBgColor: '',
  popup_onload: false,
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

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeConfig = async () => {
      if (initialId && !isInitialized) {
        await refreshConfig();
        setIsInitialized(true);
      }
    };
    
    initializeConfig();
  }, [initialId, isInitialized]);

  const updateConfig = (updates: Partial<ChatbotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const refreshConfig = async () => {
    try {
      const response = await fetch(`/api/chatbots/${initialId}`);
      if (response.ok) {
        const data = await response.json();
        
        const transformedData: ChatbotConfig = {
          id: data.id || '',
          name: data.name || '',
          greeting: data.greeting || 'How can I help you today?',
          directive: data.directive || '',
          theme: data.theme || '',
          avatar: data.avatar,
          avatarSize: data.avatarSize || 50,
          avatarColor: data.avatarColor || '',
          avatarBorder: data.avatarBorder?.toLowerCase() || '',
          avatarBgColor: data.avatarBgColor || '',
          icon: data.icon,
          iconSize: data.iconSize || 50,
          iconColor: data.iconColor || '',
          iconShape: data.iconShape?.toLowerCase() || '',
          iconBorder: data.iconBorder?.toLowerCase() || '',
          iconBgColor: data.iconBgColor || '',
          popup_onload: data.popup_onload || false,
        };
        
        setConfig(prev => ({ ...prev, ...transformedData }));
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