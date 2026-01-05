// app/dashboard/chatbots/[chatbotId]/embed/page.tsx

'use client';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Copy,
  Check,
  Code,
  Link as LinkIcon,
  Settings,
  Eye,
  EyeOff,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Share2,
  Zap,
  Lock,
  Shield
} from 'lucide-react';
export default function EmbedPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.id as string;
  
  const [chatbot, setChatbot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customizations, setCustomizations] = useState({
    showButton: true,
    autoOpen: false,
    delay: 1000,
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    buttonSize: 'medium' as 'small' | 'medium' | 'large'
  });

  // Base URL - you can make this configurable
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchChatbot();
  }, [chatbotId]);

  async function fetchChatbot() {
    try {
      setLoading(true);
      const response = await fetch(`/api/chatbots/${chatbotId}`);
      if (!response.ok) throw new Error('Failed to fetch chatbot');
      const data = await response.json();
      setChatbot(data);
      
      // Initialize customizations from chatbot config
      if (data) {
        setCustomizations(prev => ({
          ...prev,
          autoOpen: data.popup_onload || false,
          buttonColor: data.iconBgColor || '#3b82f6',
          buttonTextColor: data.iconColor || '#ffffff'
        }));
      }
    } catch (error) {
      toast.error('Error loading chatbot data');
    } finally {
      setLoading(false);
    }
  }

  // Generate embed code based on current settings
  function generateEmbedCode() {
    const { showButton, autoOpen, delay, position, buttonColor, buttonTextColor, buttonSize } = customizations;
    const simpleCode = `
    <!-- Add this script to your website -->
    <script>
      (function(w,d,s,o,f,js,fjs){
        w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
        js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
        js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
      }(window,document,'script','chatbot','${baseUrl}/embed.js'));
      
      chatbot('init', {
        chatbotId: '${chatbotId}',
        baseUrl: '${baseUrl}',
        showButton: ${showButton},
        autoOpen: ${autoOpen},
        delay: ${delay},
        position: '${position}',
        buttonColor: '${buttonColor}',
        buttonTextColor: '${buttonTextColor}',
        buttonSize: '${buttonSize}'
      });
    </script>
      `.trim();

      const advancedCode = `
    <!-- Option 1: Simple script tag -->
    <script src="${baseUrl}/embed.js" data-chatbot-id="${chatbotId}" async></script>

    <!-- Option 2: Manual initialization -->
    <div 
      data-chatbot-id="${chatbotId}"
      data-show-button="${showButton}"
      data-auto-open="${autoOpen}"
      data-delay="${delay}"
      data-position="${position}"
      data-button-color="${buttonColor}"
      data-button-text-color="${buttonTextColor}"
      data-button-size="${buttonSize}">
    </div>
    <script>
      // Initialize after load
      window.chatbot = window.chatbot || [];
      window.chatbot.push(['init', {
        chatbotId: '${chatbotId}',
        showButton: ${showButton},
        autoOpen: ${autoOpen},
        delay: ${delay},
        position: '${position}',
        buttonColor: '${buttonColor}',
        buttonTextColor: '${buttonTextColor}',
        buttonSize: '${buttonSize}'
      }]);
    </script>
    <script src="${baseUrl}/embed.js" async></script>
      `.trim();

      return showAdvanced ? advancedCode : simpleCode;
    }

// Update the embed URL
const embedUrl = `${baseUrl}/embed.js`;

  function copyToClipboard() {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast.success('Embed code copied to clipboard');
      
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadScript() {
    const code = generateEmbedCode();
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-${chatbotId}-embed.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Embed code downloaded');
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const embedCode = generateEmbedCode();

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Embed Chatbot</h1>
              <p className="text-muted-foreground">
                Add your chatbot to any website with a simple script
              </p>
            </div>
            <Badge variant={chatbot?.isActive ? "default" : "secondary"}>
              {chatbot?.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <Separator />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Preview & Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  See how your chatbot will appear on different devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Device Preview Toggles */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Smartphone className="h-4 w-4" />
                      Mobile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Tablet className="h-4 w-4" />
                      Tablet
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Monitor className="h-4 w-4" />
                      Desktop
                    </Button>
                  </div>

                  {/* Preview Container */}
                  <div className="relative border rounded-lg p-8 bg-linear-to-br from-gray-50 to-gray-100 min-h-[400px] flex items-center justify-center">
                    <div className="absolute bottom-4 right-4">
                      {/* Chatbot Button Preview */}
                      <div
                        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                        style={{
                          backgroundColor: customizations.buttonColor,
                          color: customizations.buttonTextColor,
                          borderRadius: customizations.buttonSize === 'small' ? '50%' :
                                      customizations.buttonSize === 'medium' ? '50%' : '12px',
                          width: customizations.buttonSize === 'small' ? '50px' :
                                customizations.buttonSize === 'medium' ? '60px' : '70px',
                          height: customizations.buttonSize === 'small' ? '50px' :
                                 customizations.buttonSize === 'medium' ? '60px' : '70px'
                        }}
                      >
                        <div className="text-xl">💬</div>
                      </div>
                    </div>
                    
                    {/* Position Indicators */}
                    <div className="absolute top-4 left-4 text-xs text-muted-foreground">Top Left</div>
                    <div className="absolute top-4 right-4 text-xs text-muted-foreground">Top Right</div>
                    <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">Bottom Left</div>
                    <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">Bottom Right</div>
                    
                    <div className="text-center text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Website Preview Area</p>
                      <p className="text-sm">Your chatbot button will appear here</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Embed Code */}
          <div className="space-y-8">
            {/* Embed Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Embed Code
                </CardTitle>
                <CardDescription>
                  Copy and paste this code into your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Simple Embed</Label>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{embedCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Direct Script URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={embedUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(embedUrl);
                        toast.success('Script URL copied to clipboard');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <div className="flex gap-2 w-full">
                  <Button onClick={copyToClipboard} className="flex-1 gap-2">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={downloadScript} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                
                <Button variant="ghost" className="gap-2 w-full">
                  <Share2 className="h-4 w-4" />
                  Share Embed Link
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}