"use client"

import React from 'react';
import { usePathname } from 'next/navigation';
import ChatPreview from '@/components/features/chat-preview';
import { ChatbotProvider, useChatbot } from '@/providers/chatbot-provider';

function ChatbotLayoutContent({ children, title }: { children: React.ReactNode, title: string }) {
    const { config } = useChatbot();
    
    return (
        <div className='flex w-full max-h-[calc(100vh-7rem)] h-full'>
            <div className="w-full lg:w-1/2 border-r border-border overflow-y-auto no-scrollbar p-8">
                <h1 className='text-2xl font-semibold mb-8'>{title}</h1>
                {children}
            </div>

            <div className="hidden lg:block w-1/2">
                <ChatPreview
                    id={config.id}
                    greeting={config.greeting}
                    theme={config.theme}
                    avatar={config.avatar}
                    avatarSize={config.avatarSize}
                    avatarColor={config.avatarColor}
                    icon={config.icon}
                    iconSize={config.iconSize}
                    iconColor={config.iconColor}
                    iconShape={config.iconShape}
                    showPreviewControls={true}
                />
            </div>
        </div>
    );
}

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Extract chatbotId from the pathname using a more robust approach
    const extractChatbotIdFromPathname = (path: string): string | null => {
        const match = path.match(/^\/chatbots\/([^\/]+)/);
        return match ? match[1] : null;
    };
    
    // Extract page title from the pathname
    const extractPageTitle = (path: string): string => {
        const segments = path.split('/');
        const lastSegment = segments[segments.length - 1];
        
        if (lastSegment === 'instructions') return 'Instructions';
        if (lastSegment === 'knowledge') return 'Knowledge Bases';
        if (lastSegment === 'logic') return 'Logic';
        if (lastSegment === 'theme') return 'Theme';
        if (lastSegment === 'integrations') return 'Integrations';
        if (lastSegment === 'models') return 'AI Model';
        if (lastSegment === 'settings') return 'Settings';
        
        return 'Chatbot';
    };
    
    const chatbotId = extractChatbotIdFromPathname(pathname);
    const title = extractPageTitle(pathname);

    // Add a safeguard in case the pathname doesn't contain a valid ID
    if (!chatbotId) {
        console.error('Could not extract chatbotId from pathname:', pathname);
        return <div>Error: Invalid chatbot URL</div>;
    }

    return (
        <ChatbotProvider initialId={chatbotId}>
            <ChatbotLayoutContent title={title}>
                {children}
            </ChatbotLayoutContent>
        </ChatbotProvider>
    )
}
