import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, MessageSquare, Scale, FileText, Calendar, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';
import { CaseFactsSummary } from '@/components/CaseFactsSummary';
import type { AnalysisState } from '@/pages/Analyze';
import { API_BASE_URL, type SwotMatrixData } from '../lib/legalStreamAPI';

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

const parseSwotFromText = (text: string): SwotMatrixData | null => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const swot: Partial<SwotMatrixData> = {};

  let currentSection: 'strength' | 'weakness' | 'opportunity' | 'threat' | null = null;
  let currentContent: string[] = [];

  const saveSection = () => {
    if (currentSection && currentContent.length > 0) {
      swot[currentSection] = currentContent.join(' ').trim();
      currentContent = [];
    }
  };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (lowerLine.match(/^[\*\-•]?\s*\*?\*?strength/i)) {
      saveSection();
      currentSection = 'strength';
      const match = line.match(/strength[s]?:?\s*(.+)/i);
      if (match?.[1]) currentContent.push(match[1]);
    } else if (lowerLine.match(/^[\*\-•]?\s*\*?\*?weakness/i)) {
      saveSection();
      currentSection = 'weakness';
      const match = line.match(/weakness[es]*:?\s*(.+)/i);
      if (match?.[1]) currentContent.push(match[1]);
    } else if (lowerLine.match(/^[\*\-•]?\s*\*?\*?opportunit/i)) {
      saveSection();
      currentSection = 'opportunity';
      const match = line.match(/opportunit[y|ies]*:?\s*(.+)/i);
      if (match?.[1]) currentContent.push(match[1]);
    } else if (lowerLine.match(/^[\*\-•]?\s*\*?\*?threat/i)) {
      saveSection();
      currentSection = 'threat';
      const match = line.match(/threat[s]*:?\s*(.+)/i);
      if (match?.[1]) currentContent.push(match[1]);
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  saveSection();

  if (swot.strength && swot.weakness && swot.opportunity && swot.threat) {
    return swot as SwotMatrixData;
  }

  return null;
};

const parseDirectiveToAnalysisParts = (fullDirective: string): AnalysisState[] => {
  console.log('Starting to parse directive, length:', fullDirective.length);
  const parts: AnalysisState[] = [];

  // Fixed regex: removed the \n from lookahead to capture all parts correctly
  const partRegex = /=== PART (\d+) ===\s*([\s\S]*?)(?=\s*=== PART \d+ ===|$)/g;
  let match: RegExpExecArray | null;
  let matchCount = 0;

  while ((match = partRegex.exec(fullDirective)) !== null) {
    matchCount++;
    const partNumber = parseInt(match[1]);
    const content = match[2].trim();
    
    console.log(`Found Part ${partNumber}, content length: ${content.length}`);

    const thoughts: string[] = [];
    const thoughtsRegex = /\[THOUGHTS-BEGIN\]([\s\S]*?)\[THOUGHTS-END\]/g;
    let thoughtMatch: RegExpExecArray | null;
    while ((thoughtMatch = thoughtsRegex.exec(content)) !== null) {
      thoughts.push(thoughtMatch[1].trim().replace(/\\n/g, '\n'));
    }

    const searchQueries: string[] = [];
    const queriesRegex = /\[SEARCH_QUERIES\]([\s\S]*?)(?=\[|$)/g;
    let queryMatch: RegExpExecArray | null;
    while ((queryMatch = queriesRegex.exec(content)) !== null) {
      const queries = queryMatch[1].trim().split('\n').filter(q => q.trim());
      searchQueries.push(...queries.map(q => q.replace(/^[-•]\s*/, '').trim()));
    }

    let deliverable: string | SwotMatrixData = '';
    const deliverableRegex = /\[DELIVERABLE-BEGIN\]([\s\S]*?)\[DELIVERABLE-END\]/;
    const deliverableMatch = content.match(deliverableRegex);
    const deliverableText = deliverableMatch ? deliverableMatch[1].trim().replace(/\\n/g, '\n') : '';

    if (partNumber === 5) {
      const swot = parseSwotFromText(deliverableText);
      deliverable = swot || deliverableText;
    } else {
      deliverable = deliverableText;
    }

    parts.push({
      partNumber,
      thoughts,
      searchQueries,
      deliverable,
    });
  }

  console.log(`Total parts parsed: ${matchCount}, parts array length: ${parts.length}`);
  const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);
  console.log('Part numbers in order:', sortedParts.map(p => p.partNumber));
  
  return sortedParts;
};

const DirectiveView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const { toast } = useToast();

  const hearingId = searchParams.get('hearing_id');

  const [directive, setDirective] = useState<DirectiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('DirectiveView mounted', { token: !!token, user: !!user, hearingId });
    
    if (!token || !user) {
      console.log('No auth, redirecting to login');
      navigate('/login');
      return;
    }

    if (!hearingId) {
      console.log('No hearingId, redirecting to dashboard');
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
      console.log('Fetching directive for hearing:', hearingId);

      const response = await fetch(
        `${API_BASE_URL}/hearings/${hearingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch directive');
      }

      const data = await response.json();
      console.log('Directive data received:', data);
      setDirective(data);
      if (data.full_directive) {
        const parsed = parseDirectiveToAnalysisParts(data.full_directive);
        console.log('Parsed analysis parts:', parsed);
        setAnalysisParts(parsed);
      }
    } catch (error) {
      console.error('Error fetching directive:', error);
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

  const handleContinueChat = () => {
    if (!hearingId) return;
    sessionStorage.setItem('legal_conversation_id', hearingId);
    if (directive?.case_facts) {
      sessionStorage.setItem('legal_case_description', directive.case_facts);
    }
    navigate('/chat');
  };

  const handlePrintPDF = async () => {
    if (!contentRef.current) return;

    try {
      toast({
        title: 'Generating PDF',
        description: 'Please wait...',
      });

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`directive-${directive?.hearing_id || 'document'}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Directive exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  console.log('Rendering DirectiveView', { isLoading, hasDirective: !!directive });

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
                  onClick={handlePrintPDF}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Export PDF
                </Button>
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
      <main ref={contentRef} className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ) : directive ? (
          <div className="space-y-4">
            {/* Hearing Header Card */}
            <Card className="bg-card border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        #{directive.hearing_number || '1'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Hearing #{directive.hearing_number || '1'}
                      </h2>
                      {directive.hearing_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(directive.hearing_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
                    Directive
                  </Badge>
                </div>

                {directive.case_facts && (
                  <CaseFactsSummary caseFacts={directive.case_facts} />
                )}
              </CardContent>
            </Card>


            {/* Directive content - match Analyze page formatting if possible */}
            {analysisParts.length > 0 ? (
              <ProfessionalLegalChat
                analysisParts={analysisParts}
                isStreaming={false}
                isComplete={true}
                caseDescription={undefined}
                currentPartNumber={0}
              />
            ) : (
              <Card className="bg-card border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-foreground" />
                    <h2 className="text-xl font-bold text-foreground">
                      War Game Directive
                    </h2>
                  </div>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                    {directive.full_directive}
                  </div>
                </CardContent>
              </Card>
            )}
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
