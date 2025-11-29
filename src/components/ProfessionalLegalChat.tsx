import React, { useEffect, useRef, useState } from 'react';
import { Brain, Search, FileText, CheckCircle, Bot, ChevronDown, Scale, Users, Shield, Lightbulb, GitBranch, Banknote, ListChecks, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle, Gavel, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisState } from '@/pages/Analyze';
import { SwotMatrixData } from '@/lib/legalStreamAPI';
import { useNavigate } from 'react-router-dom';
import { ReferenceCasesDisplay } from '@/components/ReferenceCasesDisplay';
import { LegalDisclaimer } from '@/components/LegalDisclaimer';
import { MessageContent } from '@/components/MessageContent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  { title: "Leverage Points & Negotiation", icon: Lightbulb },
  { title: "Execution Roadmap", icon: ListChecks },
  { title: "Final Counsel Briefing", icon: FileText },
  { title: "Reference Cases", icon: Scale },
];

/**
 * SWOT Matrix Display Component - Enhanced Visual Design with Better Colors
 */
const SwotMatrixDisplay: React.FC<{ data: SwotMatrixData }> = ({ data }) => {
  const quadrants = [
    { 
      title: 'Strengths', 
      content: data.strength, 
      icon: ThumbsUp, 
      gradient: 'from-emerald-600 to-teal-600',
      bg: 'bg-white dark:bg-slate-800',
      border: 'border-emerald-200 dark:border-emerald-800',
      headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      text: 'text-slate-700 dark:text-slate-300',
      iconColor: 'text-white'
    },
    { 
      title: 'Weaknesses', 
      content: data.weakness, 
      icon: ThumbsDown, 
      gradient: 'from-rose-600 to-pink-600',
      bg: 'bg-white dark:bg-slate-800',
      border: 'border-rose-200 dark:border-rose-800',
      headerBg: 'bg-gradient-to-r from-rose-500 to-pink-500',
      text: 'text-slate-700 dark:text-slate-300',
      iconColor: 'text-white'
    },
    { 
      title: 'Opportunities', 
      content: data.opportunity, 
      icon: Sparkles, 
      gradient: 'from-blue-600 to-indigo-600',
      bg: 'bg-white dark:bg-slate-800',
      border: 'border-blue-200 dark:border-blue-800',
      headerBg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      text: 'text-slate-700 dark:text-slate-300',
      iconColor: 'text-white'
    },
    { 
      title: 'Threats', 
      content: data.threat, 
      icon: AlertTriangle, 
      gradient: 'from-amber-600 to-orange-600',
      bg: 'bg-white dark:bg-slate-800',
      border: 'border-amber-200 dark:border-amber-800',
      headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      text: 'text-slate-700 dark:text-slate-300',
      iconColor: 'text-white'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 p-2">
      {quadrants.map(({ title, content, icon: Icon, gradient, bg, border, headerBg, text, iconColor }) => (
        <div 
          key={title} 
          className={`relative group ${bg} ${border} border-2 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
        >
          {/* Gradient header */}
          <div className={`${headerBg} px-5 py-3.5 flex items-center gap-3`}>
            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-white">
              {title}
            </h3>
          </div>
          
          {/* Content */}
          <div className="p-5">
            <p className={`text-sm leading-relaxed ${text}`}>
              {content}
            </p>
          </div>
          
          {/* Decorative corner gradient */}
          <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${gradient} opacity-5 rounded-tl-full pointer-events-none`}></div>
        </div>
      ))}
    </div>
  );
};


export const ProfessionalLegalChat: React.FC<ProfessionalLegalChatProps> = ({
  analysisParts, isStreaming, isComplete, caseDescription, currentPartNumber
}) => {
  const navigate = useNavigate();
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());
  const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(new Set());
  const currentPartRef = useRef<HTMLDivElement>(null);

  // Auto-expand current part, auto-collapse completed ones
  useEffect(() => {
    if (isStreaming && currentPartNumber > 0) {
      setExpandedParts(new Set([currentPartNumber]));
    } else if (isComplete) {
      setExpandedParts(new Set());
    }
  }, [currentPartNumber, isStreaming, isComplete]);

  // Auto-scroll to current part
  useEffect(() => {
    if (currentPartNumber > 0) {
      setTimeout(() => {
        currentPartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentPartNumber]);

  const togglePart = (partNumber: number) => {
    setExpandedParts(prev => {
      const newSet = new Set(prev);
      newSet.has(partNumber) ? newSet.delete(partNumber) : newSet.add(partNumber);
      return newSet;
    });
  };

  const toggleThoughts = (partNumber: number) => {
    setExpandedThoughts(prev => {
      const newSet = new Set(prev);
      newSet.has(partNumber) ? newSet.delete(partNumber) : newSet.add(partNumber);
      return newSet;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <span>Legal Analysis Directive</span>
          </CardTitle>
          {isStreaming && !isComplete && (
            <Badge variant="secondary" className="animate-pulse">
              Analyzing...
            </Badge>
          )}
          {isComplete && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
        {caseDescription && (
          <p className="text-sm text-muted-foreground pt-2">
            Analysis for: "{caseDescription.substring(0, 100)}..."
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {analysisParts.map(part => {
          const isCurrent = isStreaming && part.partNumber === currentPartNumber;
          const isExpanded = expandedParts.has(part.partNumber);
          const metadata = partMetadata[part.partNumber - 1] || { title: `Part ${part.partNumber}`, icon: FileText };
          const PartIcon = metadata.icon;

          return (
            <div 
              key={part.partNumber} 
              ref={isCurrent ? currentPartRef : null} 
              className={`border rounded-lg transition-all duration-300 ${
                isCurrent ? 'border-primary shadow-lg bg-primary/5' : 'border-border'
              }`}
            >
              <div 
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-accent/50 transition-colors"
                onClick={() => togglePart(part.partNumber)}
              >
                <div className="flex items-center gap-3">
                  <PartIcon className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-semibold">{metadata.title}</span>
                  {isCurrent && <span className="text-xs text-muted-foreground animate-pulse">streaming...</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isCurrent ? "default" : "outline"}>Part {part.partNumber}</Badge>
                  <ChevronDown 
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </div>

              <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 space-y-4">
                  {/* Thoughts Section - Collapsible like Perplexity */}
                  {part.thoughts.length > 0 && (
                    <Collapsible 
                      open={expandedThoughts.has(part.partNumber)}
                      onOpenChange={() => toggleThoughts(part.partNumber)}
                    >
                      <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        {/* Header - Clickable */}
                        <CollapsibleTrigger className="w-full">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 flex items-center justify-between hover:from-blue-600 hover:to-cyan-600 transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                <Brain size={20} className="text-white"/>
                              </div>
                              <h4 className="text-lg font-bold text-white">
                                Internal Reasoning
                              </h4>
                            </div>
                            <ChevronDown 
                              className={`h-5 w-5 text-white transition-transform duration-300 ${
                                expandedThoughts.has(part.partNumber) ? 'rotate-180' : ''
                              }`} 
                            />
                          </div>
                        </CollapsibleTrigger>
                        
                        {/* Collapsible Content */}
                        <CollapsibleContent>
                          <div className="p-5 space-y-3">
                            {part.thoughts.map((thought, idx) => (
                              <div key={idx} className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                                <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                  {thought.split('\n\n').map((para, pIdx) => (
                                    <p key={pIdx} className={pIdx > 0 ? 'mt-3' : ''}>
                                      {para}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Search Queries Section */}
                  {part.searchQueries.length > 0 && (
                    <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Search size={20} className="text-white"/>
                        </div>
                        <h4 className="text-lg font-bold text-white">
                          Research Queries
                        </h4>
                      </div>
                      
                      {/* Content */}
                      <div className="p-5 space-y-2.5">
                        {part.searchQueries.map((q, i) => (
                          <div key={i} className="flex items-start gap-3 group">
                            <div className="mt-1 flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i + 1}</span>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Deliverable Content */}
                  {part.deliverable && (
                    <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300">
                      {part.partNumber === 5 && typeof part.deliverable === 'object' ? (
                        <div className="relative z-10 p-2">
                          <SwotMatrixDisplay data={part.deliverable} />
                        </div>
                      ) : part.partNumber === 11 ? (
                        <div className="relative z-10">
                          <ReferenceCasesDisplay content={part.deliverable as string} />
                        </div>
                      ) : (
                        <div className="relative z-10 px-6 py-5">
                          <MessageContent 
                            content={part.deliverable as string} 
                            showCopyButton={false}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
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
      </CardContent>
    </Card>
  );
};

