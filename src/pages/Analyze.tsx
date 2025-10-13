import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RotateCcw, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData } from '@/lib/legalStreamAPI';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';

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
      // Extract content after the header if it's on the same line
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
      // Add content to current section
      currentContent.push(line);
    }
  }
  
  saveSection(); // Save the last section
  
  // Validate that we have all four sections
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
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [lastSubmittedDescription, setLastSubmittedDescription] = useState('');
  const [currentPartNumber, setCurrentPartNumber] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    return () => streamingClient?.close();
  }, [streamingClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caseDescription.trim().length < 50) return;

    // Reset state
    setLoading(true);
    setHasStarted(false);
    setError(null);
    setAnalysisParts([]);
    setAnalysisComplete(false);
    setProgressPercent(5);
    setCurrentPartNumber(0);
    setLastSubmittedDescription(caseDescription);
    streamingClient?.close();

    // Use a Map to accumulate updates for each part
    const partsMap = new Map<number, AnalysisState>();
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    let activePartNumber = 0;

    // Debounced state update function
    const scheduleUpdate = () => {
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        const sortedParts = Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber);
        setAnalysisParts(sortedParts);
      }, 100);
    };

    const client = new LegalStreamingClient({
      onStart: () => {
        console.log('Analysis started');
        setHasStarted(true);
        setProgressPercent(10);
      },
      
      onConversationId: (id: string) => {
        console.log('Conversation ID:', id);
        sessionStorage.setItem('legal_conversation_id', id);
      },
      
      onDirectivePart: (partNumber: number) => {
        console.log('New part:', partNumber);
        activePartNumber = partNumber;
        setCurrentPartNumber(partNumber);
        setProgressPercent(10 + partNumber * 7);
        
        if (!partsMap.has(partNumber)) {
          partsMap.set(partNumber, {
            partNumber,
            thoughts: [],
            searchQueries: [],
            deliverable: '',
          });
        }
        scheduleUpdate();
      },
      
      onThinking: (content: string) => {
        console.log('Thinking:', content.substring(0, 50));
        const part = partsMap.get(activePartNumber);
        if (part) {
          part.thoughts.push(content);
          scheduleUpdate();
        }
      },
      
      onSearchQueries: (queries: string[]) => {
        console.log('Search queries:', queries);
        const part = partsMap.get(activePartNumber);
        if (part) {
          part.searchQueries.push(...queries);
          scheduleUpdate();
        }
      },
      
      onDeliverable: (content: string | SwotMatrixData) => {
        console.log('Deliverable chunk received');
        const part = partsMap.get(activePartNumber);
        if (part) {
          if (typeof content === 'object') {
            part.deliverable = content;
          } else {
            // For Part 5, accumulate text and parse SWOT at the end
            if (activePartNumber === 5) {
              part.deliverable = (typeof part.deliverable === 'string' ? part.deliverable : '') + content + '\n';
            } else {
              part.deliverable = (typeof part.deliverable === 'string' ? part.deliverable : '') + content + '\n';
            }
          }
          scheduleUpdate();
        }
      },
      
      onComplete: () => {
        console.log('Analysis complete');
        if (updateTimer) clearTimeout(updateTimer);
        
        // Parse Part 5 SWOT text into structured data
        const part5 = partsMap.get(5);
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
        
        const sortedParts = Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber);
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

    setStreamingClient(client);
    
    try {
      await client.startAnalysis(caseDescription);
    } catch (err) {
      console.error('Failed to start analysis:', err);
      setError('Failed to connect to analysis service');
      setLoading(false);
      setHasStarted(false);
    }
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
                onClick={() => {
                  setError(null);
                  setCaseDescription(lastSubmittedDescription);
                  setHasStarted(false);
                }} 
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