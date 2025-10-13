import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RotateCcw, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData } from '@/lib/legalStreamAPI';
import ProfessionalLegalChat from '@/components/ProfessionalLegalChat';

export interface AnalysisState {
  partNumber: number;
  thoughts: string[];
  searchQueries: string[];
  deliverable: string | SwotMatrixData;
}

/**
 * Parse SWOT matrix from plain text format
 */
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
    
    // Check for section headers
    if (lowerLine.includes('strength') && lowerLine.match(/^[\*\-•]?\s*\*?\*?strength/i)) {
      saveSection();
      currentSection = 'strength';
      const match = line.match(/strength[s]?:?\s*(.+)/i);
      if (match && match[1]) currentContent.push(match[1]);
    } else if (lowerLine.includes('weakness') && lowerLine.match(/^[\*\-•]?\s*\*?\*?weakness/i)) {
      saveSection();
      currentSection = 'weakness';
      const match = line.match(/weakness[es]*:?\s*(.+)/i);
      if (match && match[1]) currentContent.push(match[1]);
    } else if (lowerLine.includes('opportunit') && lowerLine.match(/^[\*\-•]?\s*\*?\*?opportunit/i)) {
      saveSection();
      currentSection = 'opportunity';
      const match = line.match(/opportunit[y|ies]*:?\s*(.+)/i);
      if (match && match[1]) currentContent.push(match[1]);
    } else if (lowerLine.includes('threat') && lowerLine.match(/^[\*\-•]?\s*\*?\*?threat/i)) {
      saveSection();
      currentSection = 'threat';
      const match = line.match(/threat[s]*:?\s*(.+)/i);
      if (match && match[1]) currentContent.push(match[1]);
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  saveSection();
  
  if (swot.strength && swot.weakness && swot.opportunity && swot.threat) {
    console.log('✅ SWOT parsed successfully:', swot);
    return swot as SwotMatrixData;
  }
  
  console.warn('⚠️ SWOT parsing incomplete:', swot);
  return null;
};

const Analyze = () => {
  const { toast } = useToast();
  
  const [caseDescription, setCaseDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [lastSubmittedDescription, setLastSubmittedDescription] = useState('');
  const [currentPartNumber, setCurrentPartNumber] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Use refs to prevent cleanup during active streaming
  const streamingClientRef = useRef<LegalStreamingClient | null>(null);
  const partsMapRef = useRef<Map<number, AnalysisState>>(new Map());
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePartNumberRef = useRef(0);
  const isMountedRef = useRef(true);

  // Cleanup on unmount only
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      if (streamingClientRef.current) {
        streamingClientRef.current.close();
      }
    };
  }, []);

  // Debounced state update function
  const scheduleUpdate = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const sortedParts = Array.from(partsMapRef.current.values()).sort((a, b) => a.partNumber - b.partNumber);
      setAnalysisParts(sortedParts);
    }, 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caseDescription.trim().length < 50) return;

    // Close existing client if any
    if (streamingClientRef.current) {
      streamingClientRef.current.close();
      streamingClientRef.current = null;
    }

    // Reset state
    setLoading(true);
    setHasStarted(false);
    setError(null);
    setAnalysisParts([]);
    setAnalysisComplete(false);
    setProgressPercent(5);
    setCurrentPartNumber(0);
    setLastSubmittedDescription(caseDescription);
    
    // Clear refs
    partsMapRef.current.clear();
    activePartNumberRef.current = 0;
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    const client = new LegalStreamingClient({
      onStart: () => {
        if (!isMountedRef.current) return;
        console.log('Analysis started');
        setHasStarted(true);
        setProgressPercent(10);
      },
      
      onConversationId: (id: string) => {
        console.log('Conversation ID:', id);
        sessionStorage.setItem('legal_conversation_id', id);
      },
      
      onDirectivePart: (partNumber: number) => {
        if (!isMountedRef.current) return;
        console.log('New part:', partNumber);
        activePartNumberRef.current = partNumber;
        setCurrentPartNumber(partNumber);
        setProgressPercent(10 + partNumber * 7);
        
        if (!partsMapRef.current.has(partNumber)) {
          partsMapRef.current.set(partNumber, {
            partNumber,
            thoughts: [],
            searchQueries: [],
            deliverable: '',
          });
        }
        scheduleUpdate();
      },
      
      onThinking: (content: string) => {
        if (!isMountedRef.current) return;
        console.log('Thinking:', content.substring(0, 50));
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.thoughts.push(content);
          scheduleUpdate();
        }
      },
      
      onSearchQueries: (queries: string[]) => {
        if (!isMountedRef.current) return;
        console.log('Search queries:', queries);
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.searchQueries.push(...queries);
          scheduleUpdate();
        }
      },
      
      onDeliverable: (content: string | SwotMatrixData) => {
        if (!isMountedRef.current) return;
        console.log('Deliverable chunk received');
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          if (typeof content === 'object') {
            part.deliverable = content;
          } else {
            const currentDeliverable = typeof part.deliverable === 'string' ? part.deliverable : '';
            part.deliverable = currentDeliverable + content + '\n';
          }
          scheduleUpdate();
        }
      },
      
      onComplete: () => {
        if (!isMountedRef.current) return;
        console.log('Analysis complete');
        
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
        }
        
        // Parse Part 5 SWOT text into structured data
        const part5 = partsMapRef.current.get(5);
        if (part5 && typeof part5.deliverable === 'string') {
          const swotText = part5.deliverable;
          console.log('🔍 Attempting to parse SWOT from text:', swotText.substring(0, 200));
          const swotData = parseSwotFromText(swotText);
          if (swotData) {
            console.log('✅ SWOT successfully parsed and will be displayed as matrix');
            part5.deliverable = swotData;
          } else {
            console.log('⚠️ SWOT parsing failed, will display as text');
          }
        }
        
        const sortedParts = Array.from(partsMapRef.current.values()).sort((a, b) => a.partNumber - b.partNumber);
        setAnalysisParts(sortedParts);
        setAnalysisComplete(true);
        setLoading(false);
        setCurrentPartNumber(0);
        setProgressPercent(100);
        
        toast({ 
          title: "Analysis Complete", 
          description: "The full legal directive is now available." 
        });
      },
      
      onError: (errorMsg: string) => {
        if (!isMountedRef.current) return;
        console.error('Analysis error:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        setHasStarted(false);
        setProgressPercent(0);
        
        toast({ 
          title: "Analysis Failed", 
          variant: "destructive", 
          description: errorMsg 
        });
      }
    });

    streamingClientRef.current = client;
    
    try {
      await client.startAnalysis(caseDescription);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to start analysis:', err);
      setError('Failed to connect to analysis service');
      setLoading(false);
      setHasStarted(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setCaseDescription(lastSubmittedDescription);
    setHasStarted(false);
    setAnalysisParts([]);
    setAnalysisComplete(false);
    setProgressPercent(0);
    setCurrentPartNumber(0);
  };
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {!hasStarted && !loading && analysisParts.length === 0 && (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-4">
              <label htmlFor="case-description" className="block text-lg font-semibold">
                Describe Your Legal Case
              </label>
              <Textarea 
                id="case-description" 
                placeholder="Provide all relevant details (minimum 50 characters)..." 
                value={caseDescription} 
                onChange={(e) => setCaseDescription(e.target.value)} 
                rows={8} 
                disabled={loading}
                className="w-full"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {caseDescription.length} / 50 characters minimum
                </span>
                <Button 
                  type="submit" 
                  disabled={caseDescription.trim().length < 50 || loading}
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {(hasStarted || loading || analysisParts.length > 0) && (
            <div className="space-y-4">
              <Progress value={progressPercent} className="h-2" />
              <ProfessionalLegalChat
                analysisParts={analysisParts}
                isStreaming={loading}
                isComplete={analysisComplete}
                caseDescription={lastSubmittedDescription}
                currentPartNumber={currentPartNumber}
              />
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5 text-destructive">
              <p className="font-semibold mb-2">Error</p>
              <p className="text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="mt-2"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> 
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyze;