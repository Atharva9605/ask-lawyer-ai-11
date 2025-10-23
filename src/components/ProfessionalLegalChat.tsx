import React, { useEffect, useRef, useState } from 'react';
import { Brain, Search, FileText, CheckCircle, Bot, ChevronDown, Scale, Users, Shield, Lightbulb, GitBranch, Banknote, ListChecks, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle, Gavel, MessageSquare, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisState } from '@/pages/Analyze';
import { SwotMatrixData } from '@/lib/legalStreamAPI';
import { useNavigate } from 'react-router-dom';
import { ReferenceCasesDisplay } from '@/components/ReferenceCasesDisplay';
import { LegalDisclaimer } from '@/components/LegalDisclaimer';
import { MessageContent } from '@/components/MessageContent'; // <-- ADDED: Required for content rendering

interface ProfessionalLegalChatProps {
  analysisParts: AnalysisState[];
  isStreaming: boolean;
  isComplete: boolean;
  caseDescription?: string;
  currentPartNumber: number;
}

const partMetadata = [
  { title: "Mission Briefing", icon: Scale },
  { title: "Legal Battlefield Analysis", icon: Gavel },
  { title: "Asset & Intelligence Assessment", icon: Users },
  { title: "Red Team Analysis", icon: Shield },
  { title: "Strategic SWOT Matrix", icon: GitBranch },
  { title: "Financial Exposure & Remedies", icon: Banknote },
  { title: "Scenario War Gaming", icon: Lightbulb },
  { title: "Key Leverage Points", icon: ThumbsUp },
  { title: "Execution Roadmap", icon: ListChecks },
  { title: "Final Briefing", icon: Sparkles },
  { title: "Reference Cases & Disclaimer", icon: FileText }
];

export const ProfessionalLegalChat: React.FC<ProfessionalLegalChatProps> = ({
  analysisParts,
  isStreaming,
  isComplete,
  caseDescription,
  currentPartNumber,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null); // <-- Add this ref
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State to manage which internal thinking sections are open
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());

  const toggleExpand = (partNumber: number) => {
    setExpandedParts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partNumber)) {
        newSet.delete(partNumber);
      } else {
        newSet.add(partNumber);
      }
      return newSet;
    });
  };

  const isPartExpanded = (partNumber: number) => expandedParts.has(partNumber);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysisParts]);

  // Auto-scroll when new streaming content arrives
  useEffect(() => {
    if (!scrollRef.current) return;
    // Scroll to bottom whenever analysisParts change or streaming flag updates
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [analysisParts, isStreaming]);

  return (
    <Card className="relative overflow-hidden legal-card">
      <CardContent>
        {/* CRITICAL WRAPPER: add ref + fixed height + overflow */}
        <div
          ref={scrollRef} // <-- attach ref
          className="max-h-[70vh] overflow-y-auto pr-4"
        >
          <div className="space-y-6">
            {analysisParts.map((part) => {
              const partMeta = partMetadata[part.partNumber - 1] || {
                title: `Part ${part.partNumber}`,
                icon: FileText,
              };
              const isCurrent = part.partNumber === currentPartNumber && isStreaming;
              const isSwot = part.partNumber === 5;
              const isReferences = part.partNumber === 11;
              
              // Check if there is any internal content to show
              const hasInternalDetails = 
                (part.internalReasoning && part.internalReasoning.length > 0) ||
                (part.toolResults && part.toolResults.length > 0);
              
              const IconComponent = partMeta.icon;

              return (
                <div
                  key={part.partNumber}
                  className={`p-5 rounded-xl border transition-all duration-300 ${
                    isCurrent
                      ? 'border-primary/50 bg-primary/5 shadow-md'
                      : 'border-slate-200 dark:border-slate-800'
                  } ${part.partNumber === 1 ? 'mt-0' : 'mt-6'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <IconComponent className={`w-6 h-6 ${isCurrent ? 'text-primary' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {partMeta.title}
                      </h3>
                      
                      {/* --- DELIVERABLE CONTENT DISPLAY --- */}
                      <div className="deliverable-content">
                        {isSwot && typeof part.deliverable === 'object' && part.deliverable !== null ? (
                          // SWOT Matrix (Part 5) specific rendering
                          <div className="space-y-4 mt-3">
                            {Object.entries(part.deliverable).map(([key, value]) => (
                              <div key={key} className="p-3 border rounded-lg bg-white dark:bg-slate-800">
                                <h4 className="font-semibold text-lg capitalize mb-1 text-primary-600 dark:text-primary-400">{key}:</h4>
                                <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700 dark:text-slate-300">
                                  {Array.isArray(value) && value.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : isReferences && typeof part.deliverable === 'string' ? (
                            // Reference Cases Display (Part 11)
                            <ReferenceCasesDisplay content={part.deliverable as string} />
                        ) : (
                          // Standard content rendering
                          <MessageContent content={part.deliverable as string} />
                        )}
                      </div>
                      
                      {/* --- INTERNAL REASONING & RESEARCH QUERIES TOGGLE --- */}
                      {hasInternalDetails && (
                        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(part.partNumber)}
                            className="text-sm text-primary hover:text-primary/80 dark:text-primary-300 dark:hover:text-primary-200 transition-colors"
                          >
                            <Brain className="w-4 h-4 mr-2" />
                            {isPartExpanded(part.partNumber) 
                              ? 'Hide Internal Thinking & Research'
                              : `Show Internal Thinking & Research (${part.toolResults.length} Queries)`}
                            {isPartExpanded(part.partNumber) ? (
                                <ChevronUp className="w-4 h-4 ml-2" />
                            ) : (
                                <ChevronDown className="w-4 h-4 ml-2" />
                            )}
                          </Button>
                          
                          {/* --- COLLAPSIBLE CONTENT (CONDITIONAL RENDERING) --- */}
                          {isPartExpanded(part.partNumber) && (
                            <div className="mt-4 space-y-4">
                              {/* 1. Internal Reasoning */}
                              {part.internalReasoning.length > 0 && (
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-2">
                                        <Brain className="w-4 h-4 mr-2 text-slate-500" />
                                        Internal Reasoning:
                                    </h4>
                                    <MessageContent 
                                        content={part.internalReasoning.join('\n\n')} 
                                        className="text-sm whitespace-pre-wrap"
                                        showCopyButton={false}
                                    />
                                </div>
                              )}

                              {/* 2. Research Queries and Results */}
                              {part.toolResults.length > 0 && (
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-2">
                                        <Search className="w-4 h-4 mr-2 text-slate-500" />
                                        Research Queries & Tool Results:
                                    </h4>
                                    <div className="space-y-3">
                                        {part.toolResults.map((result, index) => (
                                            <div key={index} className="p-3 border rounded-lg bg-white dark:bg-slate-900/50">
                                                <Badge variant="secondary" className="mb-2 text-xs font-mono">
                                                    Query {index + 1}: {result.query}
                                                </Badge>
                                                {/* Tool result content */}
                                                <div className="text-xs text-slate-600 dark:text-slate-400 overflow-hidden max-h-48 whitespace-pre-wrap">
                                                    <MessageContent 
                                                        content={result.content} 
                                                        className="text-xs"
                                                        showCopyButton={false}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Currently Streaming Indicator */}
                      {isCurrent && (
                        <div className="mt-4">
                          <Badge 
                            variant="default" 
                            className="bg-primary hover:bg-primary/90 text-white animate-pulse"
                          >
                            <Bot className="w-4 h-4 mr-1" />
                            AI is Drafting...
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div ref={messagesEndRef} />
            
            {/* Legal Disclaimer - shown when analysis is complete */}
            {isComplete && (
              <div className="mt-6">
                <LegalDisclaimer />
              </div>
            )}
            
            {/* Start Chat Button - shown when analysis is complete */}
            {isComplete && (
              <div className="mt-6 p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Analysis Complete
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Continue your legal consultation with follow-up questions
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/chat')}
                    size="lg"
                    className="gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Start Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};