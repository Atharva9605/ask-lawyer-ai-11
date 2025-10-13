import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MessageContent from '@/components/MessageContent';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Bot, 
  User, 
  Moon, 
  Sun, 
  Download, 
  Search, 
  Clock,
  FileText,
  Users,
  Gavel,
  Scale,
  MessageSquare,
  Mic,
  Paperclip,
  ArrowLeft
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LegalStreamingClient } from "@/lib/legalStreamAPI";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentResponse, setCurrentResponse] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get conversation ID from sessionStorage
    const storedConversationId = sessionStorage.getItem('legal_conversation_id');
    if (storedConversationId) {
      setConversationId(storedConversationId);
      
      // Initialize streaming client
      const client = new LegalStreamingClient({
        onDeliverable: (content: string) => {
          setCurrentResponse(prev => prev + content);
        },
        onComplete: () => {
          const aiMessage: Message = {
            id: Date.now().toString(),
            content: currentResponse,
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setCurrentResponse('');
          setLoading(false);
        },
        onError: (error: string) => {
          toast({
            title: "Error",
            description: error,
            variant: "destructive"
          });
          setLoading(false);
        }
      });
      setStreamingClient(client);
    } else {
      toast({
        title: "No Active Session",
        description: "Please start an analysis first.",
        variant: "destructive"
      });
      navigate('/analyze');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSend = async () => {
    if (!input.trim() || !streamingClient) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setCurrentResponse('');

    // Send message via streaming client
    await streamingClient.sendChatMessage(input);
  };

  const exportChatTranscript = async () => {
    try {
      const transcript = messages.map(m => 
        `[${m.sender.toUpperCase()}] ${m.content}`
      ).join('\n\n');
      
      const blob = new Blob([transcript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legal-chat-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Chat transcript downloaded."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export chat transcript.",
        variant: "destructive"
      });
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-background flex-col">

      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/analyze')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Scale className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold legal-heading">Legal AI Chat</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? "AI is responding..." : "Continue your legal consultation"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportChatTranscript}
              disabled={messages.length === 0}
              className="legal-button-hover"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold legal-heading mb-2">
                Continue Your Legal Consultation
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your directive has been generated. Ask follow-up questions or request clarifications about your case.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                <Avatar className="mt-1">
                  <AvatarFallback className={message.sender === 'user' ? 'chat-message-user' : 'bg-primary/10'}>
                    {message.sender === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className={`space-y-2 ${message.sender === 'user' ? 'mr-3' : 'ml-3'}`}>
                  <div className={`rounded-2xl p-4 ${
                    message.sender === 'user' 
                      ? 'chat-message-user text-primary-foreground' 
                      : 'chat-message-ai'
                  }`}>
                    <MessageContent 
                      content={message.content}
                      className="max-w-none"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {currentResponse && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="chat-message-ai rounded-2xl p-4 max-w-[80%]">
                  <MessageContent content={currentResponse} className="max-w-none" />
                </div>
              </div>
            </div>
          )}

          {loading && !currentResponse && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4 text-primary legal-spin" />
                  </AvatarFallback>
                </Avatar>
                <div className="chat-message-ai rounded-2xl p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full legal-pulse"></div>
                    <div className="w-2 h-2 bg-primary rounded-full legal-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full legal-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex space-x-2">
            <Textarea
              placeholder="Ask a follow-up question about your case..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              className="min-h-[60px] resize-none"
            />
            <Button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="lg"
              className="legal-button-hover px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            This AI provides general legal information and should not be considered as legal advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;