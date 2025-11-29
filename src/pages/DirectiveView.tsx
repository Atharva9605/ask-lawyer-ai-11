import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, MessageSquare, Scale, FileText, Calendar, ChevronDown, Bot, CheckCircle, Gavel, Users, Shield, GitBranch, Banknote, Lightbulb, ListChecks, Brain } from 'lucide-react';
import { MessageContent } from '@/components/MessageContent';
import { format } from 'date-fns';
import { API_BASE_URL } from '../lib/legalStreamAPI';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReferenceCasesDisplay } from '@/components/ReferenceCasesDisplay';

interface DirectiveData {
  hearing_id: string;
  full_directive: string;
  chat_history: string[];
  case_facts?: string;
  hearing_date?: string;
  hearing_number?: number;
  parties?: string;
  key_action?: string;
}

interface ParsedPart {
  partNumber: number;
  title: string;
  thoughts: string[];
  searchQueries: string[];
  deliverable: string;
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

const DirectiveView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const { toast } = useToast();

  const hearingId = searchParams.get('hearing_id');

  const [directive, setDirective] = useState<DirectiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parsedParts, setParsedParts] = useState<ParsedPart[]>([]);
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());
  const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    if (!hearingId) {
      toast({
        title: 'Error',
        description: 'Missing hearing information',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    fetchDirective();
  }, [token, user, hearingId]);

  const fetchDirective = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/hearings/${hearingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch directive');
      }

      const data = await response.json();
      setDirective(data);
      
      // Parse the directive into parts
      if (data.full_directive) {
        const parts = parseDirectiveIntoParts(data.full_directive);
        setParsedParts(parts);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load directive',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!directive) return;

    const blob = new Blob([directive.full_directive], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `directive-${directive.hearing_id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Directive downloaded successfully',
    });
  };

  const parseDirectiveIntoParts = (fullDirective: string): ParsedPart[] => {
    const parts: ParsedPart[] = [];
    
    // Split by directive parts
    const partRegex = /\[DIRECTIVE-PART-(\d+)-BEGIN\]([\s\S]*?)\[DIRECTIVE-PART-\d+-END\]/g;
    let match;
    
    while ((match = partRegex.exec(fullDirective)) !== null) {
      const partNumber = parseInt(match[1]);
      const content = match[2];
      
      // Extract thoughts
      const thoughts: string[] = [];
      const thoughtsRegex = /\[THOUGHTS-BEGIN\]([\s\S]*?)\[THOUGHTS-END\]/g;
      let thoughtMatch;
      while ((thoughtMatch = thoughtsRegex.exec(content)) !== null) {
        thoughts.push(thoughtMatch[1].trim());
      }
      
      // Extract search queries
      const searchQueries: string[] = [];
      const queriesRegex = /\[SEARCH_QUERIES\]([\s\S]*?)(?=\[|$)/g;
      let queryMatch;
      while ((queryMatch = queriesRegex.exec(content)) !== null) {
        const queries = queryMatch[1].trim().split('\n- ').filter(q => q.trim());
        searchQueries.push(...queries.map(q => q.trim().replace(/^-\s*/, '')));
      }
      
      // Extract deliverable
      const deliverableRegex = /\[DELIVERABLE-BEGIN\]([\s\S]*?)\[DELIVERABLE-END\]/;
      const deliverableMatch = content.match(deliverableRegex);
      const deliverable = deliverableMatch ? deliverableMatch[1].trim() : '';
      
      const metadata = partMetadata[partNumber - 1] || { title: `Part ${partNumber}`, icon: FileText };
      
      parts.push({
        partNumber,
        title: metadata.title,
        thoughts,
        searchQueries,
        deliverable
      });
    }
    
    return parts.sort((a, b) => a.partNumber - b.partNumber);
  };

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

  const handleContinueChat = () => {
    if (!hearingId) return;
    sessionStorage.setItem('legal_conversation_id', hearingId);
    if (directive?.case_facts) {
      sessionStorage.setItem('legal_case_description', directive.case_facts);
    }
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cases
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Directive View</h1>
                  {directive && (
                    <p className="text-xs text-muted-foreground">
                      Hearing ID: {directive.hearing_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {!isLoading && directive && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={handleContinueChat}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Continue Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ) : directive ? (
          <div className="space-y-6">
            {/* Directive Content Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Bot className="h-6 w-6 text-primary" />
                    <span>Legal Analysis Directive</span>
                  </CardTitle>
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                </div>
                {directive.case_facts && (
                  <p className="text-sm text-muted-foreground pt-2">
                    Analysis for: "{directive.case_facts.substring(0, 100)}{directive.case_facts.length > 100 ? '...' : ''}"
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {parsedParts.map(part => {
                  const isExpanded = expandedParts.has(part.partNumber);
                  const metadata = partMetadata[part.partNumber - 1] || { title: part.title, icon: FileText };
                  const PartIcon = metadata.icon;

                  return (
                    <div 
                      key={part.partNumber}
                      className="border rounded-lg border-border"
                    >
                      <div 
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-accent/50 transition-colors"
                        onClick={() => togglePart(part.partNumber)}
                      >
                        <div className="flex items-center gap-3">
                          <PartIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{metadata.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Part {part.partNumber}</Badge>
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
                          {/* Thoughts Section - Collapsible */}
                          {part.thoughts.length > 0 && (
                            <Collapsible 
                              open={expandedThoughts.has(part.partNumber)}
                              onOpenChange={() => toggleThoughts(part.partNumber)}
                            >
                              <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                                
                                <CollapsibleContent>
                                  <div className="p-5 space-y-3">
                                    {part.thoughts.map((thought, idx) => (
                                      <div key={idx} className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                          {thought}
                                        </p>
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
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3.5 flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                  <MessageSquare size={20} className="text-white"/>
                                </div>
                                <h4 className="text-lg font-bold text-white">
                                  Research Queries
                                </h4>
                              </div>
                              
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
                              {part.partNumber === 11 ? (
                                <div className="relative z-10">
                                  <ReferenceCasesDisplay content={part.deliverable} />
                                </div>
                              ) : (
                                <div className="relative z-10 px-6 py-5">
                                  <MessageContent 
                                    content={part.deliverable} 
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
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Directive Not Found</h2>
              <p className="text-muted-foreground mb-6">
                Unable to load the directive for this hearing
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DirectiveView;
