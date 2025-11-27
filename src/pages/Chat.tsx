// Updated Chat.tsx — single Chat component (fixed duplicate declaration)
// Also adjusted imports for modules that may not resolve with `@/` alias in sandboxed environments.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Download, Sparkles, MessageSquare, ArrowLeft, Scale } from "lucide-react";
import { toast } from "@/hooks/use-toast";
// Changed these two imports to relative paths to avoid alias resolution errors in some environments.
import { LegalStreamingClient } from "../lib/legalStreamAPI";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { MessageContent } from "@/components/MessageContent";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

// Helper: clean unwanted prefixes from the stream
const cleanStreamChunk = (chunk: string) => {
  if (!chunk) return "";
  
  // Remove all unwanted AI prefix patterns (including the long greeting block)
  let cleaned = chunk
    .replace(/Greetings\.IamtheAILegalStrategos.*?Pleasestateyourquestion\.⚠️?/gi, "")
    .replace(/Greetings\.?/gi, "")
    .replace(/IamtheAILegalStrategos/gi, "")
    .replace(/Iampreparedtoaddress.*?Indianlegalsystem\.?/gi, "")
    .replace(/Pleasestateyourquestion\.?/gi, "")
    .replace(/⚠️\*?Note:GoogleSearchgroundingnotavailableinthisresponse\.\*?/gi, "")
    .replace(/TheWarGameDirectivefor.*?isfullyloaded\.?/gi, "")
    .replace(/Stateyourquery\.?/gi, "")
    .replace(/⚠️/g, "");
  
  return cleaned.trim();
};

// Helper: append chunks while ensuring proper spacing between words
const appendChunkWithSpacing = (existing: string, next: string) => {
  if (!existing) return next;
  if (!next) return existing;

  const lastChar = existing[existing.length - 1];
  const firstChar = next[0];
  const isBoundary = (ch: string) => /\s|[.,!?;:]/.test(ch);

  if (!isBoundary(lastChar) && !isBoundary(firstChar)) {
    return `${existing} ${next}`;
  }

  return existing + next;
};

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth() || { token: null, user: null };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentResponse, setCurrentResponse] = useState("");

  const streamedResponseRef = useRef("");
  const isStreamingRef = useRef(false);
  const firstChunkSkippedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const handleDeliverable = useCallback((content: string) => {
    if (typeof content !== "string" || !isStreamingRef.current) return;

    const cleaned = cleanStreamChunk(content);
    if (!cleaned) return;

    // Directly append streamed content without injecting extra spaces
    streamedResponseRef.current += cleaned;

    // Update display state
    setCurrentResponse(streamedResponseRef.current);
  }, []);

  const handleComplete = useCallback(() => {
    const finalResponse = streamedResponseRef.current.trim();
    isStreamingRef.current = false;

    if (finalResponse) {
      const aiMessage: Message = {
        id: `${Date.now()}-${Math.random()}`,
        content: finalResponse,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }

    // Reset all streaming state
    streamedResponseRef.current = "";
    setCurrentResponse("");
    setLoading(false);
  }, []);

  const handleError = useCallback((error: string) => {
    toast({
      title: "Error",
      description: error || "Unexpected error occurred",
      variant: "destructive",
    });

    // Reset all streaming state
    streamedResponseRef.current = "";
    setCurrentResponse("");
    setLoading(false);
    isStreamingRef.current = false;
  }, []);

  useEffect(() => {
    const storedConversationId = sessionStorage.getItem("legal_conversation_id");

    if (!storedConversationId) {
      toast({
        title: "No Active Session",
        description: "Start an analysis first.",
        variant: "destructive",
      });
      navigate("/analyze");
      return;
    }

    setConversationId(storedConversationId);

    // Defensive: if LegalStreamingClient failed to import, avoid throwing at runtime
    let client: LegalStreamingClient | null = null;
    try {
      client = new LegalStreamingClient({
        onDeliverable: handleDeliverable,
        onComplete: handleComplete,
        onError: handleError,
      });
    } catch (e) {
      console.error("Failed to initialize LegalStreamingClient:", e);
      toast({
        title: "Streaming Init Error",
        description: "Failed to initialize streaming client.",
        variant: "destructive",
      });
    }

    if (client) {
      setStreamingClient(client);
    }

    return () => {
      try {
        client?.close();
      } catch (e) {
        // ignore
      }
    };
  }, [navigate, handleDeliverable, handleComplete, handleError]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!streamingClient || loading || !conversationId) {
      if (!conversationId) {
        toast({ title: "Session Error", description: "Conversation ID is missing.", variant: "destructive" });
      }
      return;
    }

    const trimmedInput = input.trim();
    const userMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      content: trimmedInput,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    isStreamingRef.current = true;

    // Clear previous streaming state
    streamedResponseRef.current = "";
    setCurrentResponse("");

    try {
      await streamingClient!.sendChatMessage(trimmedInput, token || undefined);
    } catch (error) {
      handleError(error instanceof Error ? error.message : "Failed to send message");
    }
  };

  const exportChatTranscript = () => {
    try {
      if (messages.length === 0) {
        toast({
          title: "Nothing to Export",
          description: "There are no messages to export yet.",
          variant: "destructive",
        });
        return;
      }

      const transcript = messages
        .map((m) => `[${m.sender.toUpperCase()}] ${new Date(m.timestamp).toLocaleString()}\n${m.content}`)
        .join("\n\n" + "=".repeat(80) + "\n\n");

      const blob = new Blob([transcript], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legal-chat-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Export Successful", description: "Chat transcript downloaded." });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export chat transcript.", variant: "destructive" });
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link to={user ? '/dashboard' : '/'}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <h1 className="text-sm font-semibold">CaseMind Chat</h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={exportChatTranscript}
            disabled={messages.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && !currentResponse && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center py-20"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Continue Your Consultation</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Your legal directive has been generated. Ask follow-up questions or explore different aspects of your case.
                </p>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`group mb-8 ${
                  message.sender === 'ai' ? 'bg-muted/50' : ''
                }`}
              >
                <div className="mx-auto max-w-3xl px-4 py-6 flex gap-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {message.sender === 'user' ? 'You' : 'CaseMind AI'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm leading-7">
                      {message.sender === 'user' ? (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      ) : (
                        <MessageContent content={message.content} showCopyButton={false} />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && !currentResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group mb-8 bg-muted/50"
              >
                <div className="mx-auto max-w-3xl px-4 py-6 flex gap-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <span className="text-sm font-semibold">CaseMind AI</span>
                    <div className="flex items-center gap-1 py-2">
                      <span
                        className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce"
                        style={{ animationDelay: "0ms", animationDuration: "1s" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce"
                        style={{ animationDelay: "200ms", animationDuration: "1s" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce"
                        style={{ animationDelay: "400ms", animationDuration: "1s" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group mb-8 bg-muted/50"
              >
                <div className="mx-auto max-w-3xl px-4 py-6 flex gap-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2 overflow-hidden">
                    <span className="text-sm font-semibold">CaseMind AI</span>
                    <div className="text-sm leading-7">
                      <MessageContent content={currentResponse} showCopyButton={false} />
                      <span className="inline-block w-1 h-4 bg-foreground ml-0.5 animate-pulse" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="relative">
            <Textarea
              placeholder="Send a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[56px] max-h-[200px] pr-12 resize-none rounded-xl"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
