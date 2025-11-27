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
  
  // Remove common unwanted patterns
  let cleaned = chunk
    .replace(/IamtheAILegalStrategos/gi, "")
    .replace(/⚠️\*?Note:GoogleSearchgroundingnotavailableinthisresponse\.\*?/gi, "")
    .replace(/TheWarGameDirectivefor.*?isfullyloaded\./gi, "")
    .replace(/Stateyourquery\./gi, "");
  
  return cleaned;
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

    // Clean and normalize the chunk
    const cleaned = cleanStreamChunk(content);
    let normalized = cleaned
      .replace(/\s+/g, " ") // collapse repeated whitespace
      .replace(/([a-z])([A-Z])/g, "$1 $2") // split camel-stuck words
      .replace(/\.([A-Za-z])/g, ". $1"); // ensure space after periods

    if (!normalized.trim()) return;

    // Accumulate with safe spacing between chunks
    streamedResponseRef.current = appendChunkWithSpacing(streamedResponseRef.current, normalized);

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto">
        <motion.header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Link to={user ? "/dashboard" : "/"}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </Link>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-600/20 blur-xl rounded-full" />
                  <div className="relative w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-600" />
                    <h1 className="text-lg font-bold">CaseMind Chat</h1>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {loading ? "Thinking..." : "Ask anything about your case"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportChatTranscript}
                disabled={messages.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </motion.header>

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
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-2xl">
                      <MessageSquare className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent mb-3">
                    Continue Your Consultation
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm">
                    Your legal directive has been generated. Ask follow-up questions, request clarifications, or explore
                    different aspects of your case.
                  </p>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex gap-4 mb-6 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-10 w-10 shadow-lg">
                    <AvatarFallback
                      className={
                        message.sender === "user"
                          ? "bg-gradient-to-br from-blue-500 to-blue-600"
                          : "bg-gradient-to-br from-primary to-primary/60"
                      }
                    >
                      {message.sender === "user" ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-white" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 max-w-[80%] ${message.sender === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}
                  >
                    <div
                      className={`rounded-2xl shadow-sm ${message.sender === "user" ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm px-5 py-3" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm"}`}
                    >
                      {message.sender === "user" ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{message.content}</p>
                      ) : (
                        <div className="px-5 py-3">
                          <MessageContent content={message.content} showCopyButton={false} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">{formatTimestamp(message.timestamp)}</span>
                  </div>
                </motion.div>
              ))}

              {loading && !currentResponse && (
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
                    <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-3">
                      <div className="flex items-center space-x-1">
                        <span
                          className="w-2 h-2 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-primary/80 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentResponse && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 mb-6">
                  <Avatar className="h-10 w-10 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      <Bot className="h-5 w-5 text-white animate-pulse" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 max-w-[80%]">
                    <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="px-5 py-3">
                        <MessageContent content={currentResponse} showCopyButton={false} />
                        <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse"></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <motion.div className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg p-4">
          <div className="relative max-w-4xl mx-auto">
            <Textarea
              placeholder="Ask a follow-up question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[60px] max-h-[200px] pr-14 resize-none bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-2xl"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="absolute bottom-2 right-2 rounded-xl shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Chat;
