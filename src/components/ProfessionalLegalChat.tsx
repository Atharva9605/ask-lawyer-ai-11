import React, { useEffect, useRef, useState } from 'react';
import { Brain, Search, FileText, CheckCircle, Bot, ChevronDown, Scale, Users, Shield, Lightbulb, GitBranch, Banknote, ListChecks, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle, Gavel, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisState } from '@/pages/Analyze';
import { SwotMatrixData } from '@/lib/legalStreamAPI';
import { useNavigate } from 'react-router-dom';

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
  { title: "Mandatory Disclaimer", icon: FileText },
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
            <p className={`text-sm leading-relaxed ${text} whitespace-pre-wrap`}>
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

/**
 * Deliverable Content with professional, visually stunning formatting
 */
const DeliverableContent: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;
    let listStartIndex = 0;
    let inNestedStructure = false;
    
    const flushList = (index: number) => {
      if (currentList.length > 0) {
        if (listType === 'numbered') {
          elements.push(
            <ol key={`list-${listStartIndex}`} className="my-3 space-y-2.5 pl-6">
              {currentList.map((item, i) => (
                <li key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 pl-3 relative">
                  <span className="absolute left-[-1.75rem] font-semibold text-primary">{i + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-slate-100 font-semibold">$1</strong>').replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-400">$1</em>') }} />
                </li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`list-${listStartIndex}`} className="my-3 space-y-2.5 pl-6">
              {currentList.map((item, i) => (
                <li key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 relative pl-3 before:content-[''] before:absolute before:left-[-1.25rem] before:top-[0.6em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary">
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-slate-100 font-semibold">$1</strong>').replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-400">$1</em>') }} />
                </li>
              ))}
            </ul>
          );
        }
        currentList = [];
        listType = null;
      }
    };
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        flushList(index);
        inNestedStructure = false;
        return;
      }
      
      // Level 1 Headers: Numbers followed by period and capital text (e.g., "1. Mission Briefing")
      const level1Match = trimmed.match(/^(\d+)\.\s+([A-Z][^:]*?)$/);
      if (level1Match) {
        flushList(index);
        inNestedStructure = false;
        elements.push(
          <div key={index} className="mt-8 mb-5 first:mt-0">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-700">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-sm">
                {level1Match[1]}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {level1Match[2]}
              </h2>
            </div>
          </div>
        );
        return;
      }
      
      // Level 2 Headers: Bold standalone text or text ending with colon (not inline with content)
      if ((trimmed.match(/^\*\*[^*]+\*\*:?\s*$/) || trimmed.match(/^[A-Z][A-Za-z\s&(),]+:$/)) && !trimmed.match(/:\s+\w/)) {
        flushList(index);
        inNestedStructure = false;
        const headerText = trimmed.replace(/\*\*/g, '').replace(/:$/, '').trim();
        elements.push(
          <h3 key={index} className="text-base font-bold text-slate-800 dark:text-slate-200 mt-6 mb-3 flex items-center gap-2.5 first:mt-2">
            <span className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full"></span>
            <span>{headerText}</span>
          </h3>
        );
        return;
      }
      
      // Level 3 Headers: Bold inline text with content (e.g., "**Primary Objective:** content")
      const level3Match = trimmed.match(/^\*\*([^*]+)\*\*:?\s+(.+)/);
      if (level3Match) {
        flushList(index);
        inNestedStructure = false;
        const formatted = level3Match[2]
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-400">$1</em>');
        
        elements.push(
          <div key={index} className="mb-3 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border-l-2 border-primary">
            <span className="font-bold text-slate-900 dark:text-slate-100">{level3Match[1]}:</span>{' '}
            <span className="text-sm text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: formatted }} />
          </div>
        );
        return;
      }
      
      // Scenario blocks (e.g., "Scenario 1: Full Compliance")
      const scenarioMatch = trimmed.match(/^(Scenario\s+\d+):\s*(.+)$/i);
      if (scenarioMatch) {
        flushList(index);
        inNestedStructure = true;
        elements.push(
          <div key={index} className="mt-5 mb-3 bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg border-l-4 border-primary">
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {scenarioMatch[1]}: <span className="text-primary">{scenarioMatch[2]}</span>
            </h4>
          </div>
        );
        return;
      }
      
      // Numbered lists (e.g., "1. ", "2. ")
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch && trimmed.match(/^\d+\.\s+[a-z]/i)) {
        if (listType !== 'numbered') {
          flushList(index);
          listType = 'numbered';
          listStartIndex = index;
        }
        currentList.push(numberedMatch[2]);
        return;
      }
      
      // Bullet points (•, *, -, -)
      if (trimmed.match(/^[•\-*]\s+/)) {
        if (listType !== 'bullet') {
          flushList(index);
          listType = 'bullet';
          listStartIndex = index;
        }
        const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
        currentList.push(bulletText);
        return;
      }
      
      // Special formatting for key-value pairs (e.g., "Description: text")
      const keyValueMatch = trimmed.match(/^([A-Z][A-Za-z\s]+):\s+(.+)/);
      if (keyValueMatch && inNestedStructure) {
        flushList(index);
        const formatted = keyValueMatch[2]
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-400">$1</em>');
        
        elements.push(
          <div key={index} className="mb-2 pl-4">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{keyValueMatch[1]}:</span>{' '}
            <span className="text-sm text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: formatted }} />
          </div>
        );
        return;
      }
      
      // Regular paragraphs
      flushList(index);
      const formatted = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>');
      
      const className = inNestedStructure 
        ? "text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-2 pl-4"
        : "text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3";
      
      elements.push(
        <p key={index} className={className}>
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </p>
      );
    });
    
    flushList(lines.length);
    return elements;
  };

  return (
    <div className="relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 rounded-lg -z-10"></div>
      
      {/* Content with beautiful typography */}
      <div className="relative px-6 py-5 space-y-1">
        {formatContent(content)}
      </div>
      
      {/* Bottom accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
    </div>
  );
};

export const ProfessionalLegalChat: React.FC<ProfessionalLegalChatProps> = ({
  analysisParts, isStreaming, isComplete, caseDescription, currentPartNumber
}) => {
  const navigate = useNavigate();
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());
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
                  {/* Thoughts Section */}
                  {part.thoughts.length > 0 && (
                    <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Brain size={20} className="text-white"/>
                        </div>
                        <h4 className="text-lg font-bold text-white">
                          Internal Reasoning
                        </h4>
                      </div>
                      
                      {/* Content */}
                      <div className="p-5 space-y-3">
                        {part.thoughts.map((thought, idx) => (
                          <div key={idx} className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                              {thought}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
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
                      ) : (
                        <div className="relative z-10">
                          <DeliverableContent 
                            content={part.deliverable as string} 
                            isStreaming={isCurrent}
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

