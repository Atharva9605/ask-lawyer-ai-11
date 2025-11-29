import React, { useState, useEffect } from 'react';
import { Brain, Search, FileText, Target, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DirectivePart {
  partNumber: number;
  partTitle: string;
  content: string;
}

interface StreamingAnalysisDisplayProps {
  thinkingContent: string[];
  directiveParts: DirectivePart[];
  isStreaming: boolean;
  isComplete: boolean;
  caseDescription?: string;
}

interface ParsedSection {
  thoughts: string[];
  searchQueries: string[];
  toolResults: string[];
  deliverables: string[];
}

// Function to render content with Tavily links
const renderContentWithLinks = (content: string) => {
  // Enhanced regex to match quoted search terms that could be Tavily results
  const linkPattern = /"([^"]+(?:law|legal|act|section|India|court|supreme|high|civil|criminal|constitution|code|rule|regulation|directive|disclaimer|analysis|case|judgment|procedure)[^"]*)"/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    
    // Add the linked text
    const searchTerm = match[1];
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' India legal')}`;
    
    parts.push(
      <a
        key={match.index}
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline font-medium"
      >
        "{searchTerm}"
        <ExternalLink className="h-3 w-3" />
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return parts.length > 1 ? parts : content;
};

export const StreamingAnalysisDisplay: React.FC<StreamingAnalysisDisplayProps> = ({
  thinkingContent,
  directiveParts,
  isStreaming,
  isComplete,
  caseDescription
}) => {
  const [parsedSections, setParsedSections] = useState<ParsedSection>({
    thoughts: [],
    searchQueries: [],
    toolResults: [],
    deliverables: []
  });

  // Parse the streamed content into structured sections
  useEffect(() => {
    const allContent = [...thinkingContent, ...directiveParts.map(p => p.content)].join('\n');
    
    const thoughts: string[] = [];
    const searchQueries: string[] = [];
    const toolResults: string[] = [];
    const deliverables: string[] = [];

    // Parse THOUGHTS sections
    const thoughtsRegex = /\[THOUGHTS-BEGIN\]([\s\S]*?)\[THOUGHTS-END\]/g;
    let match;
    while ((match = thoughtsRegex.exec(allContent)) !== null) {
      thoughts.push(match[1].trim().replace(/\\n/g, '\n'));
    }

    // Parse SEARCH_QUERIES sections
    const queriesRegex = /\[SEARCH_QUERIES\]([\s\S]*?)(?=\[|$)/g;
    while ((match = queriesRegex.exec(allContent)) !== null) {
      const queries = match[1].trim().split('\n- ').filter(q => q.trim());
      searchQueries.push(...queries.map(q => q.trim().replace(/^-\s*/, '').replace(/\\n/g, '')));
    }

    // Parse TOOL-RESULT sections
    const toolRegex = /\[TOOL-RESULT-BEGIN\]([\s\S]*?)\[TOOL-RESULT-END\]/g;
    while ((match = toolRegex.exec(allContent)) !== null) {
      toolResults.push(match[1].trim().replace(/\\n/g, '\n'));
    }

    // Parse DELIVERABLE sections
    const deliverableRegex = /\[DELIVERABLE-BEGIN\]([\s\S]*?)\[DELIVERABLE-END\]/g;
    while ((match = deliverableRegex.exec(allContent)) !== null) {
      deliverables.push(match[1].trim().replace(/\\n/g, '\n'));
    }

    setParsedSections({ thoughts, searchQueries, toolResults, deliverables });
  }, [thinkingContent, directiveParts]);

  const formatMarkdown = (text: string) => {
    // Process markdown without adding extra <br> tags
    let processed = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\n\* (.*?)(?=\n|$)/g, '<li class="ml-4">$1</li>');
    
    // Split into paragraphs by double newlines
    const paragraphs = processed.split(/\n\n+/);
    return paragraphs
      .map(para => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        // Convert single newlines to spaces within paragraphs
        const withSpaces = trimmed.replace(/\n/g, ' ');
        return `<p class="mb-3">${withSpaces}</p>`;
      })
      .join('');
  };

  return (
    <div className="max-w-4xl mx-auto bg-background">
      {/* Chat Container */}
      <div className="space-y-6">
        {/* User Message */}
        {caseDescription && (
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3">
              <p className="text-sm leading-relaxed">{caseDescription}</p>
            </div>
          </div>
        )}

        {/* AI Response */}
        <div className="flex justify-start">
          <div className="max-w-[80%] bg-card border rounded-2xl rounded-bl-sm shadow-sm">
            {/* Thinking Header */}
            <div className="border-b bg-muted/30 rounded-t-2xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">🧠 AI Legal Analysis Process</span>
                </div>
                {isStreaming && !isComplete ? (
                  <Badge variant="secondary" className="animate-pulse">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Thinking...
                    </div>
                  </Badge>
                ) : isComplete ? (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Done
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Analysis Content */}
            <div className="p-4 space-y-4">
              {/* Internal Reasoning - Perplexity style with tooltips */}
              {parsedSections.thoughts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    🧠 Internal Reasoning
                  </div>
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2">
                      {parsedSections.thoughts.map((thought, index) => {
                        // Extract first sentence or first 60 chars as the point
                        const firstSentence = thought.split(/[.!?]/)[0].trim() || thought.substring(0, 60);
                        const summary = firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
                        
                        return (
                          <Tooltip key={index} delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full text-xs font-medium text-primary cursor-help transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {summary}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              className="max-w-sm p-3 bg-popover text-popover-foreground shadow-lg"
                            >
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">{thought}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                </div>
              )}

              {/* Search Queries Section */}
              {parsedSections.searchQueries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    🔍 Search Queries
                  </div>
                  <ul className="space-y-1">
                    {parsedSections.searchQueries.map((query, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Search className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{query}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tool Results Section */}
              {parsedSections.toolResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    📑 Tool Results
                  </div>
                  {parsedSections.toolResults.map((result, index) => (
                    <details key={index} className="group">
                      <summary className="cursor-pointer text-sm text-primary hover:text-primary/80 mb-2">
                        View Tool Result {index + 1}
                      </summary>
                      <pre className="text-xs bg-muted p-3 rounded border overflow-x-auto">
                        {result}
                      </pre>
                    </details>
                  ))}
                </div>
              )}

              {/* Deliverables Section */}
              {parsedSections.deliverables.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    🎯 Deliverable
                  </div>
                  {parsedSections.deliverables.map((deliverable, index) => (
                    <div key={index} className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(deliverable) }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Directive Parts - Always show all 11 parts */}
              {directiveParts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    📋 Legal Analysis Parts ({directiveParts.length}/11)
                  </div>
                  {directiveParts.map((part) => (
                    <div key={part.partNumber} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          Part {part.partNumber}
                        </Badge>
                        <span className="text-sm font-medium text-primary">{part.partTitle}</span>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {renderContentWithLinks(part.content)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {parsedSections.thoughts.length === 0 && 
               parsedSections.deliverables.length === 0 && 
               directiveParts.length === 0 && 
               !isStreaming && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    Waiting for analysis to begin...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};