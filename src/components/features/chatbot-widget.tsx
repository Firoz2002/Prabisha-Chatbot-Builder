// components/chatbot/widget.tsx
'use client';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Zap,
  XIcon,
  MicIcon, 
  MicOffIcon, 
  RefreshCw, 
  Send,
  UserPlus,
  CheckCircle2
} from 'lucide-react';
import { ChatMessage } from '@/types/chat';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from '@/components/ui/shadcn-io/ai/prompt-input';
import { useChatbot } from '@/hooks/useChatbot';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useLeadGeneration } from '@/hooks/useLeadGeneration';
import { LeadForm } from '@/components/forms/lead-form';
import { Button } from '@/components/ui/button';

interface ChatbotWidgetProps {
  chatbotId: string;
  initialChatbotData?: any;
}

export default function ChatbotWidget({ chatbotId, initialChatbotData }: ChatbotWidgetProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  // Use the chatbot hook
  const {
    chatbot,
    isLoadingChatbot,
    chatbotError,
    text,
    setText,
    status,
    messages,
    loading,
    error,
    isCheckingSession,
    hasLoadedInitialMessages,
    quickQuestions,
    conversationId,
    handleSubmit,
    handleQuickQuestion,
    handleNewChat,
    formatTime,
    messagesEndRef,
    inputRef,
    chatContainerRef,
  } = useChatbot({
    chatbotId,
    initialChatbotData,
  });

  // Use lead generation hook
  const {
    activeLeadForm,
    isLeadFormVisible,
    shouldShowLeadForm,
    isLoadingLeadConfig,
    leadFormError,
    hasSubmittedLead,
    showLeadForm,
    hideLeadForm,
    submitLeadForm,
    checkLeadRequirements,
    markLeadAsSubmitted,
  } = useLeadGeneration({
    chatbotId,
    conversationId,
    onLeadCollected: (leadData) => {
      console.log('Lead collected:', leadData);
      // You can trigger additional actions here
    },
  });

  useEffect(() => {
    if (!chatbotId) return;
    
    // Generate session ID for anonymous user
    const sessionId = localStorage.getItem(`chatbot_session_${chatbotId}`) || 
                      `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(sessionId);
    localStorage.setItem(`chatbot_session_${chatbotId}`, sessionId);
    
    setIsInitialized(true);
    
    // Notify parent window of widget load
    window.parent.postMessage({ 
      type: 'chatbot-loaded',
      chatbotId: chatbotId 
    }, '*');
  }, [chatbotId]);

  // Handle closing from inside
  const handleClose = () => {
    window.parent.postMessage({ 
      type: 'chatbot-close',
      chatbotId: chatbotId 
    }, '*');
  };

  // Handle resize
  const handleResize = (width: string, height: string) => {
    window.parent.postMessage({ 
      type: 'chatbot-resize',
      chatbotId: chatbotId,
      width,
      height
    }, '*');
  };

  // Check lead requirements when messages change
  useEffect(() => {
    if (messages.length > 0 && !hasSubmittedLead && conversationId) {
      checkLeadRequirements();
    }
  }, [messages, hasSubmittedLead, conversationId, checkLeadRequirements]);

  // Show lead form automatically if needed
  useEffect(() => {
    if (shouldShowLeadForm && activeLeadForm && !isLeadFormVisible && !loading) {
      setTimeout(() => {
        showLeadForm();
      }, 1000);
    }
  }, [shouldShowLeadForm, activeLeadForm, isLeadFormVisible, loading, showLeadForm]);

  if (!isInitialized || isLoadingChatbot) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chatbot...</p>
        </div>
      </div>
    );
  }

  if (chatbotError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center p-4">
          <p className="text-destructive">Failed to load chatbot</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return null;
  }

  return (
    <ChatBot 
      chatbot={chatbot} 
      onClose={handleClose}
      text={text}
      setText={setText}
      status={status}
      messages={messages}
      loading={loading}
      error={error}
      isCheckingSession={isCheckingSession}
      hasLoadedInitialMessages={hasLoadedInitialMessages}
      quickQuestions={quickQuestions}
      conversationId={conversationId}
      handleSubmit={handleSubmit}
      handleQuickQuestion={handleQuickQuestion}
      handleNewChat={handleNewChat}
      formatTime={formatTime}
      messagesEndRef={messagesEndRef}
      inputRef={inputRef}
      chatContainerRef={chatContainerRef}
      // Lead generation props
      activeLeadForm={activeLeadForm}
      isLeadFormVisible={isLeadFormVisible}
      shouldShowLeadForm={shouldShowLeadForm}
      isLoadingLeadConfig={isLoadingLeadConfig}
      leadFormError={leadFormError}
      hasSubmittedLead={hasSubmittedLead}
      showLeadForm={showLeadForm}
      hideLeadForm={hideLeadForm}
      submitLeadForm={submitLeadForm}
      markLeadAsSubmitted={markLeadAsSubmitted}
    />
  );
}

interface ChatBotProps {
  chatbot: any;
  onClose: () => void;
  // Chat state props
  text: string;
  setText: (text: string) => void;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  isCheckingSession: boolean;
  hasLoadedInitialMessages: boolean;
  quickQuestions: string[];
  conversationId: string | null;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleQuickQuestion: (question: string) => Promise<void>;
  handleNewChat: () => Promise<void>;
  formatTime: (date?: Date) => string;
  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  // Lead generation props
  activeLeadForm: any;
  isLeadFormVisible: boolean;
  shouldShowLeadForm: boolean;
  isLoadingLeadConfig: boolean;
  leadFormError: string | null;
  hasSubmittedLead: boolean;
  showLeadForm: () => void;
  hideLeadForm: () => void;
  submitLeadForm: (formData: Record<string, string>) => Promise<boolean>;
  markLeadAsSubmitted: () => void;
}

function ChatBot({
  chatbot,
  onClose,
  // Chat state
  text,
  setText,
  status,
  messages,
  loading,
  error,
  isCheckingSession,
  hasLoadedInitialMessages,
  quickQuestions,
  conversationId,
  handleSubmit,
  handleQuickQuestion,
  handleNewChat,
  formatTime,
  // Refs
  messagesEndRef,
  inputRef,
  chatContainerRef,
  // Lead generation
  activeLeadForm,
  isLeadFormVisible,
  shouldShowLeadForm,
  isLoadingLeadConfig,
  leadFormError,
  hasSubmittedLead,
  showLeadForm,
  hideLeadForm,
  submitLeadForm,
  markLeadAsSubmitted,
}: ChatBotProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(false);
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

  const {
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechToText({ continuous: true, lang: "en-US" });
  
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);

  // Add styles to body when embedded to prevent outer scrolling
  useEffect(() => {
    if (isEmbedded) {
      document.body.style.overflow = 'hidden';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.height = '100vh';
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
    }
  }, [isEmbedded]);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update text with transcript from speech recognition
  useEffect(() => {
    if (transcript) {
      setText(transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript, setText]);

  // Sync microphone state with listening
  useEffect(() => {
    if (isMicrophoneOn) {
      startListening();
    } else {
      stopListening();
      resetTranscript();
    }
  }, [isMicrophoneOn, startListening, stopListening, resetTranscript]);

  const handleToggleMicrophone = () => {
    if (!browserSupportsSpeechRecognition) {
      return;
    }
    setIsMicrophoneOn(!isMicrophoneOn);
  };

  const handleLeadFormSuccess = () => {
    markLeadAsSubmitted();
    // You can add a success message to the chat
    // For example: addMessageToChat({ role: 'bot', content: 'Thank you for your information!' });
  };

  if (isCheckingSession || !hasLoadedInitialMessages) {
    return (
      <div className={`${isEmbedded ? 'w-full h-full' : `fixed ${isMobile ? 'inset-0' : 'bottom-6 right-6'} z-50`}`}>
        <div className={`
          ${isMobile || isEmbedded ? 'w-full h-full rounded-none' : 'w-[95vw] sm:w-96 md:w-[480px] h-[600px] rounded-xl bottom-6 right-6'}
          bg-background flex flex-col border shadow-2xl overflow-hidden
        `}>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      ${isEmbedded ? 'w-full h-full' : `fixed ${isMobile ? 'inset-0' : 'bottom-6 right-6'} z-50`} 
      ${isMobile && !isOpen ? 'hidden' : ''}
    `}>
      {isOpen ? (
        <div className={`
          ${isMobile || isEmbedded ? 'w-full h-full rounded-none' : 'w-[95vw] sm:w-96 md:w-[480px] h-[600px] rounded-xl bottom-6 right-6'}
          bg-background flex flex-col border shadow-2xl animate-in slide-in-from-bottom-full duration-300 overflow-hidden
        `}>
          <ChatHeader 
            onClose={() => {
              if (isEmbedded) {
                onClose();
              } else {
                setIsOpen(false);
              }
            }} 
            chatbot={chatbot}
          />

          {/* Lead Form Overlay */}
          {isLeadFormVisible && activeLeadForm && (
            <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <LeadForm
                  config={activeLeadForm}
                  chatbotId={chatbot.id}
                  conversationId={conversationId || ''}
                  onClose={hideLeadForm}
                  onSuccess={handleLeadFormSuccess}
                  onSubmitLead={submitLeadForm}
                />
              </div>
            </div>
          )}

          <ChatMessages
            messages={messages}
            loading={loading}
            status={status}
            error={error}
            quickQuestions={quickQuestions}
            onQuickQuestion={handleQuickQuestion}
            chatContainerRef={chatContainerRef}
            messagesEndRef={messagesEndRef}
            formatTime={formatTime}
            chatbot={chatbot}
            // Add new prop for lead form button
            showLeadForm={!hasSubmittedLead && activeLeadForm ? showLeadForm : undefined}
            hasSubmittedLead={hasSubmittedLead}
          />
            
            {error && (
              <div className="mx-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in slide-in-from-bottom">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <XIcon className="h-3 w-3" />
                  {error}
                </p>
              </div>
            )}

            <ChatInput
              text={text}
              setText={setText}
              loading={loading}
              isMicrophoneOn={isMicrophoneOn}
              setIsMicrophoneOn={setIsMicrophoneOn}
              browserSupportsSpeechRecognition={browserSupportsSpeechRecognition}
              onSubmit={handleSubmit}
              onNewChat={handleNewChat}
              status={status}
              inputRef={inputRef}
              onToggleMicrophone={handleToggleMicrophone}
              // Add new prop for lead button
              hasLeadForm={!hasSubmittedLead && !!activeLeadForm}
              onShowLeadForm={showLeadForm}
              isLoadingLeadConfig={isLoadingLeadConfig}
            />
        </div>
      ) : (
        !isEmbedded && (
          <ChatToggleButton 
            onClick={() => setIsOpen(true)} 
            isMobile={isMobile} 
            chatbot={chatbot}
          />
        )
      )}
    </div>
  );
}

interface ChatToggleButtonProps {
  onClick: () => void;
  isMobile: boolean;
  chatbot: any;
}

function ChatToggleButton({ onClick, isMobile, chatbot }: ChatToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 text-primary-foreground
        border border-primary
        rounded-full shadow-lg hover:shadow-xl transition-all duration-300
        hover:scale-110 active:scale-95 group animate-bounce-slow
        ${isMobile ? 'hidden' : ''}
      `}
      aria-label="Open chatbot"
    >
      <div className="relative">
        <Image
          src={chatbot.avatar || chatbot.icon || "/character1.png"}
          height={70}
          width={70}
          alt={chatbot.name || "Chat Assistant"}
          className="rounded-full"
        />
      </div>
      <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full font-bold animate-pulse">
        Chat
      </div>
    </button>
  );
}

interface ChatHeaderProps {
  onClose: () => void;
  chatbot: any;
}

function ChatHeader({ onClose, chatbot }: ChatHeaderProps) {
  return (
    <div className={`bg-primary text-primary-foreground p-4 rounded-t-xl flex justify-between items-center overflow-visible z-10 relative`}>
      <div className="relative flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md">
          <Image 
            src={chatbot.avatar || "/icons/logo.png"}
            height={48}
            width={48}
            alt={chatbot.name || "Assistant"}
            className="h-full w-full object-contain"
            unoptimized 
          />
        </div>
        
        <div>
          <h3 className="font-semibold text-lg">{chatbot.name || "Property Assistant"}</h3>
          <p className="text-xs opacity-90">{chatbot.description || "I am here to help you."}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {chatbot.workspace?.logo && (
          <Image
            src={chatbot.workspace.logo}
            height={100}
            width={100}
            alt="logo"
            unoptimized
          />
        )}

        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <XIcon size={20} />
        </button>
      </div>
    </div>
  );
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  error: string;
  quickQuestions: string[];
  onQuickQuestion: (question: string) => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (date?: Date) => string;
  chatbot: any;
  showLeadForm?: () => void;
  hasSubmittedLead: boolean;
}

const sanitizedHTML = (html: string) => DOMPurify.sanitize(html);

function ChatMessages({
  messages,
  loading,
  status,
  error,
  quickQuestions,
  onQuickQuestion,
  chatContainerRef,
  messagesEndRef,
  formatTime,
  chatbot,
  showLeadForm,
  hasSubmittedLead,
}: ChatMessagesProps) {
  
  const hasUserMessages = messages.filter(m => m.role === 'user').length > 0;
  const hasMultipleMessages = messages.length >= 2;

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto bg-linear-to-b from-background to-muted/30 relative"
    >
      <div className="p-4 space-y-6">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`shrink-0 flex flex-col items-center w-[50px] ${msg.role === 'user' ? 'hidden' : ''}`}>
              <Image 
                src={chatbot.icon || "/icons/logo1.png"} 
                height={50} 
                width={50} 
                alt={chatbot.name || "Assistant"} 
                className='p-1 rounded-full bg-primary/10 flex items-center justify-center'
              />

              <span className="text-xs text-center break-words w-full leading-tight mt-1">
                {chatbot.name || "Assistant"}
              </span>
            </div>
            
            <div className={`${msg.role === 'user' ? 'ml-auto' : ''}`}>
              <div 
                className={`
                  rounded-2xl p-4 shadow-sm animate-in fade-in duration-200
                  ${msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-card border rounded-tl-none'}
                `}
              >
                <div 
                  className={`
                    prose prose-sm max-w-none
                    ${msg.role === 'user' ? 'text-primary-foreground' : 'text-foreground'}
                  `}
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizedHTML(msg.content).replace(/<a /g, `<a target="_blank" rel="noopener noreferrer" `)
                  }}
                />
                {msg.timestamp && (
                  <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Lead Collection Call-to-Action */}
        {showLeadForm && hasMultipleMessages && !hasSubmittedLead && !loading && (
          <div className="flex justify-center animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 max-w-md w-full">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Ready to get started?</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Share your details and we'll help you get the best solution.
                  </p>
                  <button
                    onClick={showLeadForm}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Get Started Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thinking animation while generating */}
        {loading && status === 'submitted' && (
          <div className="flex items-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Image src={chatbot.avatar || chatbot.icon || "/character1.png"}  height={16} width={16} alt="Character" />
            </div>
            <div className="bg-card border rounded-2xl rounded-tl-none p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  {/* Thinking animation dots */}
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm">Thinking</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {loading && status === 'streaming' && (
          <div className="flex items-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Image 
                src={chatbot.avatar || chatbot.icon || "/character1.png"} 
                height={16} 
                width={16} 
                alt={chatbot.name || "Assistant"} 
              />
            </div>
            <div className="bg-card border rounded-2xl rounded-tl-none p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Searching...</p>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!hasUserMessages && quickQuestions.length > 0 && (
          <div className="mt-8 animate-in fade-in delay-300">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Quick suggestions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => onQuickQuestion(question)}
                  disabled={loading}
                  className={`
                    group text-left p-3 rounded-xl border transition-all duration-200
                    hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                    bg-card hover:bg-accent hover:border-accent-foreground/20
                    animate-in fade-in
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary">
                    {question}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}

interface ChatInputProps {
  text: string;
  setText: (text: string) => void;
  loading: boolean;
  isMicrophoneOn: boolean;
  setIsMicrophoneOn: (value: boolean) => void;
  browserSupportsSpeechRecognition: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onNewChat: () => void;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onToggleMicrophone: () => void;
  hasLeadForm?: boolean;
  onShowLeadForm?: () => void;
  isLoadingLeadConfig?: boolean;
}

function ChatInput({
  text,
  setText,
  loading,
  isMicrophoneOn,
  setIsMicrophoneOn,
  browserSupportsSpeechRecognition,
  onSubmit,
  onNewChat,
  status,
  inputRef,
  onToggleMicrophone,
  hasLeadForm,
  onShowLeadForm,
  isLoadingLeadConfig,
}: ChatInputProps) {

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  return (
    <div className="border-t bg-background p-3">
      <PromptInput onSubmit={handleFormSubmit}>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <PromptInputTextarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message here..."
              disabled={loading || isMicrophoneOn}
              className="min-h-12 max-h-32"
              rows={1}
            />
            <PromptInputToolbar>
              <PromptInputTools>
                {/* Lead Form Button */}
                {hasLeadForm && onShowLeadForm && !isLoadingLeadConfig && (
                  <PromptInputButton
                    size="sm"
                    variant="ghost"
                    onClick={onShowLeadForm}
                    title="Get started"
                    className="text-xs hover:bg-primary/10 text-primary"
                    disabled={loading}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Get Started</span>
                  </PromptInputButton>
                )}
                
                {browserSupportsSpeechRecognition && (
                  <PromptInputButton
                    size="sm"
                    variant="ghost"
                    onClick={onToggleMicrophone}
                    title={isMicrophoneOn ? "Stop voice input" : "Start voice input"}
                    className={isMicrophoneOn ? "bg-destructive/10 text-destructive" : ""}
                    disabled={loading}
                  >
                    {isMicrophoneOn ? (
                      <>
                        <MicOffIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Listening...</span>
                      </>
                    ) : (
                      <>
                        <MicIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Voice</span>
                      </>
                    )}
                  </PromptInputButton>
                )}
                <PromptInputButton
                  size="sm"
                  variant="ghost"
                  onClick={onNewChat}
                  title="New chat"
                  className="text-xs hover:bg-primary/10"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </PromptInputButton>
              </PromptInputTools>
            </PromptInputToolbar>
          </div>
          <PromptInputSubmit
            size="icon"
            disabled={(!text.trim() && !isMicrophoneOn) || loading}
            status={status}
            className="h-12 w-12 rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </PromptInputSubmit>
        </div>
      </PromptInput>
      
      {/* Loading indicator for lead config */}
      {isLoadingLeadConfig && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading form configuration...
        </div>
      )}
    </div>
  );
}