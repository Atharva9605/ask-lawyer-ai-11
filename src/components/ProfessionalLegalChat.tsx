import React, { useEffect, useRef, useState } from 'react';
import { Brain, Search, FileText, CheckCircle, Bot, ChevronDown, Scale, Users, Shield, Lightbulb, GitBranch, Banknote, ListChecks, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle, Gavel, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisState } from '@/pages/Analyze';
import { SwotMatrixData } from '@/lib/legalStreamAPI';
import { useNavigate } from 'react-router-dom';
import { ReferenceCasesDisplay } from '@/components/ReferenceCasesDisplay'; // Assuming this component exists
import { LegalDisclaimer } from '@/components/LegalDisclaimer';
import { StreamingAnalysisDisplay } from './StreamingAnalysisDisplay'; // Corrected import for display

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
  { title: "Leverage Points", icon: ThumbsUp },
  { title: "Execution Roadmap", icon: ListChecks },
  { title: "Final Briefing & Summary", icon: Sparkles },
  { title: "Disclaimer", icon: AlertTriangle }, // Part 11
];

export const ProfessionalLegalChat: React.FC<ProfessionalLegalChatProps> = ({
  analysisParts,
  isStreaming,
  isComplete,
  caseDescription,
  currentPartNumber,
}) => {
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // CRITICAL FIX: Fallback state for completion to ensure compliance components are shown.
  // Checks if the final part (Part 11, the Disclaimer) is present in the analysis.
  const hasFinalPart = analysisParts.some(p => p.partNumber === partMetadata.length);
  const showCompleteComponents = isComplete || hasFinalPart;

  useEffect(() => {
    // Auto-scroll logic (common pattern)
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [analysisParts, isStreaming]);

  return (
    <Card className="shadow-lg legal-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-6 h-6" /> Legal Advisor Directive
        </CardTitle>
        <Badge variant={isStreaming ? "secondary" : (showCompleteComponents ? "default" : "outline")} className="text-sm px-3 py-1">
          {isStreaming ? 'STREAMING...' : (showCompleteComponents ? 'COMPLETE' : `PART ${currentPartNumber}`)}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Case Briefing */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Case Brief
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {caseDescription}
          </p>
        </div>

        {/* Dynamic Analysis Content */}
        {analysisParts.map((part) => {
          const meta = partMetadata.find(m => part.partNumber === partMetadata.indexOf(m) + 1);
          const isCurrent = part.partNumber === currentPartNumber && isStreaming;

          return (
            <div key={part.partNumber} className="border-b border-dashed border-slate-200 dark:border-slate-700 pb-6 last:border-b-0">
              <div className="flex items-center gap-3 mb-4">
                {meta?.icon && <meta.icon className={`h-6 w-6 ${part.partNumber <= currentPartNumber ? 'text-primary' : 'text-muted-foreground'}`} />}
                <h3 className={`text-xl font-bold ${part.partNumber <= currentPartNumber ? 'text-slate-900 dark:text-slate-100' : 'text-muted-foreground'}`}>
                  Part {part.partNumber}: {meta?.title || `Analysis Part ${part.partNumber}`}
                </h3>
              </div>

              <div className="pl-9 space-y-4">
                {/* SWOT Matrix Display (Part 5) - Assumes ReferenceCasesDisplay can handle SwotMatrixData */}
                {part.partNumber === 5 && typeof part.deliverable !== 'string' && (
                  <ReferenceCasesDisplay
                    {...({ data: part.deliverable as SwotMatrixData } as unknown as React.ComponentProps<typeof ReferenceCasesDisplay>)}
                  />
                )}
                
                {/* General Content Display */}
                {typeof part.deliverable === 'string' && part.deliverable.trim().length > 0 && (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                      <StreamingAnalysisDisplay content={part.deliverable} />
                    </div>
                )}
                
                {/* Streaming Indicator */}
                {isCurrent && (
                  <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                    <Bot className="h-4 w-4" /> Generating analysis...
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Legal Disclaimer - shown when analysis is complete or final part is present (Compliance Fix) */}
        {showCompleteComponents && (
          <div className="mt-6">
            <LegalDisclaimer />
          </div>
        )}
        
        {/* Start Chat Button - shown when analysis is complete or final part is present (Usability Fix) */}
        {showCompleteComponents && (
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