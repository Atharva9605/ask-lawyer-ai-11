import React, { useEffect, useRef, useState } from 'react';
import {
  Brain, Search, FileText, CheckCircle, Bot, ChevronDown, Scale, Users,
  Shield, Lightbulb, GitBranch, Banknote, ListChecks, ThumbsUp, ThumbsDown,
  Sparkles, AlertTriangle, Gavel
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisState } from '@/pages/Analyze';
import { SwotMatrixData } from '@/lib/legalStreamAPI';

// =====================================
// Part Metadata (icons + titles)
// =====================================
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

// =====================================
// SWOT Matrix Display
// =====================================
const SwotMatrixDisplay: React.FC<{ data: SwotMatrixData }> = ({ data }) => {
  const quadrants = [
    { title: 'Strengths', icon: ThumbsUp, color: 'emerald', content: data.strength },
    { title: 'Weaknesses', icon: ThumbsDown, color: 'rose', content: data.weakness },
    { title: 'Opportunities', icon: Sparkles, color: 'indigo', content: data.opportunity },
    { title: 'Threats', icon: AlertTriangle, color: 'amber', content: data.threat },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
      {quadrants.map(({ title, icon: Icon, color, content }) => (
        <div
          key={title}
          className={`rounded-xl border border-${color}-200 dark:border-${color}-900/40 bg-gradient-to-br from-${color}-50 to-white dark:from-slate-800 dark:to-slate-900 shadow-sm hover:shadow-md transition-all duration-300`}
        >
          <div className={`flex items-center gap-3 px-5 py-3 bg-${color}-600 text-white rounded-t-xl`}>
            <Icon className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// =====================================
// Deliverable Content Formatter
// =====================================
const DeliverableContent: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Big Heading (Uppercase or numbered main sections)
      if (/^(\d+\.)\s+[A-Z]/.test(trimmed) || /^[A-Z\s]+:$/.test(trimmed)) {
        elements.push(
          <h2 key={index} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            {trimmed.replace(/:$/, '')}
          </h2>
        );
      }
      // Medium Heading (**Header:**)
      else if (/^\*\*[^*]+\*\*:/.test(trimmed)) {
        const parts = trimmed.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
        if (parts)
          elements.push(
            <h3 key={index} className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">
              {parts[1]}: <span className="font-normal text-slate-700 dark:text-slate-300">{parts[2]}</span>
            </h3>
          );
      }
      // Bullet or numbered points
      else if (/^(\d+\.)|^[-*•]\s+/.test(trimmed)) {
        const point = trimmed.replace(/^(\d+\.)|^[-*•]\s+/, '');
        elements.push(
          <li key={index} className="ml-6 list-disc text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {point}
          </li>
        );
      }
      // Paragraph
      else {
        elements.push(
          <p key={index} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
            {trimmed}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800/40 shadow-inner border border-slate-200 dark:border-slate-700">
      {formatContent(content)}
      {isStreaming && <span className="animate-pulse text-primary ml-1">▋</span>}
    </div>
  );
};

// =====================================
// Main Component
// =====================================
export const ProfessionalLegalChat: React.FC<{
  analysisParts: AnalysisState[];
  isStreaming: boolean;
  isComplete: boolean;
  caseDescription?: string;
  currentPartNumber: number;
}> = ({ analysisParts, isStreaming, isComplete, caseDescription, currentPartNumber }) => {
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());
  const currentPartRef = useRef<HTMLDivElement>(null);

  // Expand current part
  useEffect(() => {
    if (isStreaming && currentPartNumber > 0)
      setExpandedParts(new Set([currentPartNumber]));
  }, [isStreaming, currentPartNumber]);

  useEffect(() => {
    if (currentPartRef.current)
      currentPartRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentPartNumber]);

  const togglePart = (num: number) => {
    setExpandedParts(prev => {
      const s = new Set(prev);
      s.has(num) ? s.delete(num) : s.add(num);
      return s;
    });
  };

  return (
    <Card className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            Legal Analysis Directive
          </CardTitle>
          {isStreaming && !isComplete && (
            <Badge variant="secondary" className="animate-pulse">Analyzing...</Badge>
          )}
          {isComplete && (
            <Badge className="bg-green-600 text-white flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Complete
            </Badge>
          )}
        </div>
        {caseDescription && (
          <p className="text-sm text-muted-foreground mt-2">
            Analyzing case: “{caseDescription.slice(0, 100)}...”
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {analysisParts.map(part => {
          const isExpanded = expandedParts.has(part.partNumber);
          const isCurrent = part.partNumber === currentPartNumber && isStreaming;
          const meta = partMetadata[part.partNumber - 1] || { title: `Part ${part.partNumber}`, icon: FileText };
          const Icon = meta.icon;

          return (
            <div
              key={part.partNumber}
              ref={isCurrent ? currentPartRef : null}
              className={`rounded-lg border transition-all duration-300 ${
                isCurrent ? 'border-primary shadow-lg bg-primary/5' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div
                onClick={() => togglePart(part.partNumber)}
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-slate-500'}`} />
                  <span className="font-medium">{meta.title}</span>
                  {isCurrent && <span className="text-xs text-primary animate-pulse">streaming...</span>}
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Expandable content */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 space-y-4">
                  {/* Thoughts */}
                  {part.thoughts.length > 0 && (
                    <div className="border rounded-lg border-blue-200 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900">
                      <div className="flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-t-lg">
                        <Brain className="h-5 w-5" />
                        <h4 className="font-semibold">Internal Reasoning</h4>
                      </div>
                      <div className="p-5 space-y-3">
                        {part.thoughts.map((t, i) => (
                          <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {t}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Queries */}
                  {part.searchQueries.length > 0 && (
                    <div className="border rounded-lg border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900">
                      <div className="flex items-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-t-lg">
                        <Search className="h-5 w-5" />
                        <h4 className="font-semibold">Research Queries</h4>
                      </div>
                      <div className="p-5 space-y-2">
                        {part.searchQueries.map((q, i) => (
                          <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {i + 1}. {q}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliverable */}
                  {part.deliverable && (
                    <div className="border rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      {part.partNumber === 5 && typeof part.deliverable === 'object' ? (
                        <SwotMatrixDisplay data={part.deliverable} />
                      ) : (
                        <DeliverableContent
                          content={part.deliverable as string}
                          isStreaming={isCurrent}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
