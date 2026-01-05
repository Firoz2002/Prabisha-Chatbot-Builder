export interface PropertySearchResponse {
  response: string;
  type: "property_search";
  conversationId: string | null;
  timestamp: string;
  processingTime: string;
  modelUsed: string;
  resultCount: number;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp?: Date;
}

export interface UserData {
  name: string;
  email: string;
}

export interface Message {
  _id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface QuickQuestion {
  text: string;
  icon: React.ReactNode;
}