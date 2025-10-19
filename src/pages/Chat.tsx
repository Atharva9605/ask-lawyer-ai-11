import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Bot, 
  User, 
  Download, 
  ArrowLeft,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LegalStreamingClient } from "@/lib/legalStreamAPI";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentResponse, setCurrentResponse] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  useEffect(() => {
    const storedConversationId = sessionStorage.getItem('legal_conversation_id');
    if (storedConversationId) {
      setConversationId(storedConversationId);
      
      const client = new LegalStreamingClient({
        onDeliverable: (content: string) => {
          if (typeof content === 'string') {
            setCurrentResponse(prev => prev + content);
          }
        },
        onComplete: () => {
          if (currentResponse.trim()) {
            const aiMessage: Message = {
              id: Date.now().toString(),
              content: currentResponse,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
          }
          setCurrentResponse('');
          setLoading(false);
        },
        onError: (error: string) => {
          toast({
            title: "Error",
            description: error,
            variant: "destructive"
          });
          setCurrentResponse('');
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

    return () => {
      if (streamingClient) {
        streamingClient.close();
      }
    };
  }, [navigate]);

  const handleSend = async () => {
    if (!input.trim() || !streamingClient || loading) return;

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

    await streamingClient.sendChatMessage(input);
  };

  const exportChatTranscript = () => {
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
        description: "Failed to export chat transcript.",
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col w-full max-w-5xl mx-auto">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/analyze')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                    Legal AI Assistant
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {loading ? "Thinking..." : "Ask me anything about your case"}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportChatTranscript}
              disabled={messages.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </motion.header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4">
          <div className="max-w-4xl mx-auto py-8">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && !currentResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-2xl">
                      <MessageSquare className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent mb-3">
                    Continue Your Consultation
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm">
                    Your legal directive has been generated. Ask follow-up questions, request clarifications, or explore different aspects of your case.
                  </p>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex gap-4 mb-6 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-10 w-10 shadow-lg">
                    <AvatarFallback className={
                      message.sender === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-br from-primary to-primary/60'
                    }>
                      {message.sender === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-white" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                    <div className={`
                      px-5 py-3 rounded-2xl shadow-sm
                      ${message.sender === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                      }
                    `}>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        message.sender === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {message.content}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground px-1">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              {currentResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 mb-6"
                >
                  <Avatar className="h-10 w-10 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      <Bot className="h-5 w-5 text-white animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 max-w-[80%]">
                    <div className="px-5 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {currentResponse}
                        <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse"></span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {loading && !currentResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 mb-6"
                >
                  <Avatar className="h-10 w-10 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      <Bot className="h-5 w-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="px-5 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg"
        >
          <div className="p-4 max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Ask a follow-up question about your case..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[60px] max-h-[200px] pr-14 resize-none bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-primary rounded-2xl"
                disabled={loading}
              />
              <Button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="absolute bottom-2 right-2 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              This AI provides general legal information and should not be considered as legal advice.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Chat;