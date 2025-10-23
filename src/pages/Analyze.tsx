import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RotateCcw, FileText, Clock, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData } from '@/lib/legalStreamAPI';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';
import SegmentedProgress from '@/components/SegmentedProgress';
import { EnhancedLegalReferences } from "@/components/EnhancedLegalReferences";

export interface AnalysisState {
  partNumber: number;
  internalReasoning: string[];
  searchQueries: string[];
  toolResults: Array<{ query: string; content: string }>;
  deliverable: string | SwotMatrixData;
}

// Note: Update ProfessionalLegalChat.tsx interface to match:
// - Replace 'thoughts' with 'internalReasoning'
// - Add 'toolResults' field

const parseSwotFromText = (text: string): SwotMatrixData | null => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const swot: Partial<SwotMatrixData> = {};

  let currentSection: keyof SwotMatrixData | null = null;

  let currentContent: string[] = [];
  const saveSection = () => {
    if (currentSection && currentContent.length > 0) {
      // Preserve as an array of trimmed non-empty strings to match SwotMatrixData
      swot[currentSection] = currentContent.map(s => s.trim()).filter(Boolean);
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

const Analyze = () => {
  const { toast } = useToast();

  const [caseDescription, setCaseDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [lastSubmittedDescription, setLastSubmittedDescription] = useState('');
  const [currentPartNumber, setCurrentPartNumber] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    setError(null);
    return () => {
      // Safely attempt to clean up the streaming client using whatever teardown method exists.
      const client: any = streamingClient;
      if (!client) return;

      if (typeof client.close === 'function') {
        client.close();
      } else if (typeof client.disconnect === 'function') {
        client.disconnect();
      } else if (typeof client.stop === 'function') {
        client.stop();
      } else if (typeof client.terminate === 'function') {
        client.terminate();
      }
    };
  }, [streamingClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caseDescription.trim().length < 50) return;

    setLoading(true);
    setHasStarted(false);
    setError(null);
    setAnalysisParts([]);
    setAnalysisComplete(false);
    setCurrentPartNumber(0);
    setLastSubmittedDescription(caseDescription);
    sessionStorage.removeItem('legal_case_description');
    if (streamingClient) {
      const client: any = streamingClient;
      if (typeof client.close === 'function') {
        client.close();
      } else if (typeof client.disconnect === 'function') {
        client.disconnect();
      } else if (typeof client.stop === 'function') {
        client.stop();
      } else if (typeof client.terminate === 'function') {
        client.terminate();
      }
    }

    const partsMap = new Map<number, AnalysisState>();
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    let activePartNumber = 0;

    const scheduleUpdate = () => {
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        const sortedParts = Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber);
        setAnalysisParts(sortedParts);
      }, 100);
    };

    const client = new (LegalStreamingClient as any)({
      baseURL: 'https://legal-backend-api-chatbot.onrender.com',
      onStart: () => {
        console.log('Analysis started');
        setHasStarted(true);
      },

      onConversationId: (id: string) => {
        sessionStorage.setItem('legal_conversation_id', id);
      },

      onDirectivePart: (partNumber: number) => {
        activePartNumber = partNumber;
        setCurrentPartNumber(partNumber);
        if (!partsMap.has(partNumber)) {
          partsMap.set(partNumber, {
            partNumber,
            internalReasoning: [],
            searchQueries: [],
            toolResults: [],
            deliverable: '',
          });
        }
        scheduleUpdate();
      },

      onInternalReasoning: (content: string) => {
        const part = partsMap.get(activePartNumber);
        if (part) {
          part.internalReasoning.push(content);
          scheduleUpdate();
        }
      },

      onSearchQueries: (queries: string[]) => {
        const part = partsMap.get(activePartNumber);
        if (part) {
          part.searchQueries.push(...queries);
          scheduleUpdate();
        }
      },

      onToolResult: (query: string, content: string) => {
        const part = partsMap.get(activePartNumber);
        if (part) {
          // Find existing result or create new one
          let result = part.toolResults.find(r => r.query === query);
          if (!result) {
            result = { query, content: '' };
            part.toolResults.push(result);
          }
          result.content += content + '\n';
          scheduleUpdate();
        }
      },

      onDeliverable: (content: string | SwotMatrixData) => {
        // Use functional state update to ensure new object + array references
        setAnalysisParts((prevParts) => {
          if (prevParts.length === 0) return prevParts;

          // Find index for the active part (fall back to last element if not found)
          const idx = prevParts.findIndex(p => p.partNumber === activePartNumber);
          if (idx === -1) return prevParts;

          const newParts = [...prevParts]; // new array reference
          const currentPart = { ...newParts[idx] }; // new object reference

          if (typeof content === 'object') {
            currentPart.deliverable = content;
          } else {
            currentPart.deliverable =
              (typeof currentPart.deliverable === 'string' ? currentPart.deliverable : '') + content + '\n';
          }

          newParts[idx] = currentPart;

          // Keep partsMap in sync for other callbacks that rely on it
          partsMap.set(activePartNumber, currentPart);

          return newParts;
        });
        // Also schedule any batched UI updates if needed
        scheduleUpdate();
      },

      onComplete: () => {
        if (updateTimer) clearTimeout(updateTimer);

        const part5 = partsMap.get(5);
        if (part5 && typeof part5.deliverable === 'string') {
          const swotData = parseSwotFromText(part5.deliverable);
          if (swotData) {
            part5.deliverable = swotData;
          }
        }

        const sortedParts = Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber);
        setAnalysisParts(sortedParts);
        setAnalysisComplete(true);
        setLoading(false);
        setCurrentPartNumber(0);
        
        sessionStorage.setItem('legal_case_description', lastSubmittedDescription);

        toast({
          title: 'Analysis Complete',
          description: 'The full legal directive is now available.',
        });
      },

      onError: (errorMsg: string) => {
        console.error('Analysis error:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        setHasStarted(false);
        toast({
          title: 'Analysis Failed',
          variant: 'destructive',
          description: errorMsg,
        });
      },
    });

    setStreamingClient(client);

    const textBlob = new Blob([caseDescription], { type: 'text/plain' });
    const virtualFile = new File([textBlob], "case_description.txt", { type: 'text/plain' });
    
    try {
      await client.startAnalysis(virtualFile);
    } catch (err) {
      console.error('Failed to start analysis:', err);
      setError('Failed to connect to analysis service');
      setLoading(false);
      setHasStarted(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!streamingClient) {
      toast({
        title: 'Error',
        description: 'Unable to download PDF. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const downloadFn = (streamingClient as any)?.downloadDirectivePDF;
    if (typeof downloadFn === 'function') {
      try {
        downloadFn.call(streamingClient);
        toast({
          title: 'PDF Download Started',
          description: 'Your directive PDF is being downloaded.',
        });
      } catch (err) {
        console.error('Failed to start PDF download', err);
        toast({
          title: 'Error',
          description: 'Failed to start PDF download.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Not Supported',
        description: 'PDF download is not supported by the current client.',
        variant: 'destructive',
      });
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
          <Link to="/upload"> 
            <Button variant="outline" size="sm">
              Switch to File Upload
            </Button>
          </Link>
          
          {analysisComplete && (
            <Button 
              onClick={handleDownloadPDF} 
              variant="default" 
              size="sm"
              className="ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          {!hasStarted && !loading && analysisParts.length === 0 && (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-4"
            >
              <label htmlFor="case-description" className="block text-lg font-semibold">
                Describe Your Legal Case
              </label>
              <Textarea
                id="case-description"
                placeholder="Provide all relevant details (minimum 50 characters)..."
                value={caseDescription}
                onChange={e => setCaseDescription(e.target.value)}
                rows={8}
                disabled={loading}
                className="w-full"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {caseDescription.length} / 50 characters minimum
                </span>
                <Button type="submit" disabled={caseDescription.trim().length < 50 || loading}>
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
              <SegmentedProgress
                currentPart={currentPartNumber}
                totalParts={11}
                isComplete={analysisComplete}
              />
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