// hooks/useLeadGeneration.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface LeadForm {
  id: string;
  formTitle: string;
  formDesc?: string;
  leadFormStyle: 'EMBEDDED' | 'MESSAGES';
  cadence: 'ALL_AT_ONCE' | 'ONE_BY_ONE' | 'GROUPED';
  fields: string;
  successMessage?: string;
  redirectUrl?: string;
  autoClose: boolean;
  showThankYou: boolean;
}

interface UseLeadGenerationProps {
  chatbotId: string;
  conversationId: string | null;
  onLeadCollected?: (leadData: any) => void;
}

interface UseLeadGenerationReturn {
  activeLeadForm: LeadForm | null;
  isLeadFormVisible: boolean;
  shouldShowLeadForm: boolean;
  isLoadingLeadConfig: boolean;
  leadFormError: string | null;
  hasSubmittedLead: boolean;
  
  showLeadForm: () => void;
  hideLeadForm: () => void;
  submitLeadForm: (formData: Record<string, string>) => Promise<boolean>;
  checkLeadRequirements: () => Promise<void>;
  markLeadAsSubmitted: () => void;
}

export function useLeadGeneration({
  chatbotId,
  conversationId,
  onLeadCollected
}: UseLeadGenerationProps): UseLeadGenerationReturn {
  const [activeLeadForm, setActiveLeadForm] = useState<LeadForm | null>(null);
  const [isLeadFormVisible, setIsLeadFormVisible] = useState(false);
  const [shouldShowLeadForm, setShouldShowLeadForm] = useState(false);
  const [isLoadingLeadConfig, setIsLoadingLeadConfig] = useState(false);
  const [leadFormError, setLeadFormError] = useState<string | null>(null);
  const [hasSubmittedLead, setHasSubmittedLead] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Fetch lead configuration
  const fetchLeadConfig = useCallback(async () => {
    if (!chatbotId || hasSubmittedLead) return;
    
    setIsLoadingLeadConfig(true);
    setLeadFormError(null);
    
    try {
      const response = await fetch(
        `/api/chatbots/${chatbotId}/lead`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.isActive) {
          setActiveLeadForm(data.config);
          setKeywords(data.triggerKeywords || []);
          
          // Check if should show immediately
          if (data.triggerType === 'ALWAYS' || data.triggerType === 'BEGINNING') {
            setShouldShowLeadForm(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching lead config:', error);
      setLeadFormError('Failed to load lead form configuration');
    } finally {
      setIsLoadingLeadConfig(false);
    }
  }, [chatbotId, hasSubmittedLead]);

  // Initialize
  useEffect(() => {
    fetchLeadConfig();
    
    // Check local storage for existing lead submission
    const hasSubmitted = localStorage.getItem(`chatbot_${chatbotId}_lead_submitted`);
    if (hasSubmitted === 'true') {
      setHasSubmittedLead(true);
    }
  }, [chatbotId, fetchLeadConfig]);

  // Monitor messages for lead triggers
  useEffect(() => {
    if (!activeLeadForm || hasSubmittedLead) return;

    // Check for keyword triggers
    const checkKeywords = (content: string) => {
      if (!keywords.length) return false;
      const lowerContent = content.toLowerCase();
      return keywords.some(keyword => 
        lowerContent.includes(keyword.toLowerCase())
      );
    };

    // This should be called when new messages arrive
    // You'll need to integrate this with your chat state
  }, [activeLeadForm, keywords, hasSubmittedLead]);

  const checkLeadRequirements = useCallback(async () => {
    if (!chatbotId || !conversationId || hasSubmittedLead || !activeLeadForm) return;
    
    try {
      const response = await fetch(
        `/api/chatbots/${chatbotId}/check-lead-requirements?conversationId=${conversationId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.shouldShowForm) {
          setShouldShowLeadForm(true);
        }
      }
    } catch (error) {
      console.error('Error checking lead requirements:', error);
    }
  }, [chatbotId, conversationId, hasSubmittedLead, activeLeadForm]);

  const submitLeadForm = async (formData: Record<string, string>): Promise<boolean> => {
    if (!chatbotId || !conversationId || !activeLeadForm) return false;
    
    try {
      const response = await fetch(`/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: activeLeadForm.id,
          data: formData,
          conversationId,
          chatbotId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mark as submitted
        setHasSubmittedLead(true);
        localStorage.setItem(`chatbot_${chatbotId}_lead_submitted`, 'true');
        
        // Update conversation with lead ID
        if (result.leadId && conversationId) {
          await fetch(`/api/chat/${conversationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: result.leadId })
          });
        }
        
        // Callback
        onLeadCollected?.(result);
        
        toast.success(result.successMessage || 'Thank you for your information!');
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit form');
        return false;
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('An error occurred. Please try again.');
      return false;
    }
  };

  const showLeadForm = () => {
    if (activeLeadForm && !hasSubmittedLead) {
      setIsLeadFormVisible(true);
      setShouldShowLeadForm(false);
    }
  };

  const hideLeadForm = () => {
    setIsLeadFormVisible(false);
  };

  const markLeadAsSubmitted = () => {
    setHasSubmittedLead(true);
    setIsLeadFormVisible(false);
    setShouldShowLeadForm(false);
    localStorage.setItem(`chatbot_${chatbotId}_lead_submitted`, 'true');
  };

  return {
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
  };
}