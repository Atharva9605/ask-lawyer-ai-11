import React from 'react';
import { ExternalLink, Info, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReferenceCase {
  name: string;
  citation: string;
  link: string;
  applicability: string;
}

interface ReferenceCasesDisplayProps {
  content: string;
}

const parseReferenceCases = (content: string): ReferenceCase[] => {
  const cases: ReferenceCase[] = [];
  const caseBlocks = content.split(/###\s*Case\s*\d+:/i).slice(1);
  
  caseBlocks.forEach(block => {
    const lines = block.trim().split('\n');
    let name = '';
    let citation = '';
    let link = '';
    let applicability = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Extract case name (first line or starts with brackets)
      if (!name && trimmedLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
        name = trimmedLine.replace(/^\[|\]$/g, '').trim();
      }
      
      // Extract citation
      const citationMatch = trimmedLine.match(/\*?\*?Citation\*?\*?:?\s*(.+)/i);
      if (citationMatch) {
        citation = citationMatch[1].trim();
      }
      
      // Extract link
      const linkMatch = trimmedLine.match(/\*?\*?Link\*?\*?:?\s*(.+)/i);
      if (linkMatch) {
        link = linkMatch[1].trim();
      }
      
      // Extract applicability
      const applicabilityMatch = trimmedLine.match(/\*?\*?Applicability\*?\*?:?\s*(.+)/i);
      if (applicabilityMatch) {
        applicability = applicabilityMatch[1].trim();
      }
    }
    
    if (name && citation) {
      cases.push({ name, citation, link, applicability });
    }
  });
  
  return cases;
};

export const ReferenceCasesDisplay: React.FC<ReferenceCasesDisplayProps> = ({ content }) => {
  const cases = parseReferenceCases(content);
  
  if (cases.length === 0) {
    return null;
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Reference Cases
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((caseItem, index) => (
            <Card 
              key={index}
              className="group relative overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
            >
              {/* Decorative gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 -z-10" />
              
              <div className="p-5 space-y-3">
                {/* Case Name with Info Icon */}
                <div className="flex items-start gap-2">
                  <h4 className="flex-1 text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {caseItem.name}
                  </h4>
                  {caseItem.applicability && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0 w-7 h-7 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center cursor-help transition-colors">
                          <Info className="h-4 w-4 text-primary" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="max-w-xs p-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-none shadow-2xl"
                      >
                        <p className="text-sm leading-relaxed font-medium">
                          <span className="block font-bold mb-1 text-amber-400 dark:text-amber-600">How this applies:</span>
                          {caseItem.applicability}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                
                {/* Citation */}
                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Citation</p>
                  <p className="text-sm font-mono text-slate-800 dark:text-slate-200">
                    {caseItem.citation}
                  </p>
                </div>
                
                {/* View Case Link */}
                {caseItem.link && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                    onClick={() => window.open(caseItem.link, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Full Case
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};
