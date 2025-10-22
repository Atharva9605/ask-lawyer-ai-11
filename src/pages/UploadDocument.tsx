import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RotateCcw, FileText, Clock, Upload, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData } from '@/lib/legalStreamAPI';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';
import SegmentedProgress from '@/components/SegmentedProgress';

export interface AnalysisState {
  partNumber: number;
  thoughts: string[];
  searchQueries: string[];
  deliverable: string | SwotMatrixData;
}

const localParseSwotFromText = (text: string): SwotMatrixData | null => {
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

const UploadDocument = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [caseFile, setCaseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [lastSubmittedFileName, setLastSubmittedFileName] = useState('');
  const [currentPartNumber, setCurrentPartNumber] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [summarizedFacts, setSummarizedFacts] = useState('');

  useEffect(() => {
    return () => streamingClient?.close();
  }, [streamingClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCaseFile(e.target.files[0]);
    } else {
      setCaseFile(null);
    }
  };

  const handleRemoveFile = () => {
    setCaseFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseFile) return;

    setLoading(true);
    setHasStarted(false);
    setError(null);
    setAnalysisParts([]);
    setAnalysisComplete(false);
    setCurrentPartNumber(0);
    setLastSubmittedFileName(caseFile.name);
    sessionStorage.removeItem('legal_case_description'); 
    streamingClient?.close();

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

    const client = new LegalStreamingClient({
      onStart: () => setHasStarted(true),
      onConversationId: (id: string) => sessionStorage.setItem('legal_conversation_id', id),
      onDirectivePart: (partNumber: number) => {
        activePartNumber = partNumber;
        setCurrentPartNumber(partNumber);
        if (!partsMap.has(partNumber)) {
          partsMap.set(partNumber, { partNumber, thoughts: [], searchQueries: [], deliverable: '' });
        }
        scheduleUpdate();
      },
      onThinking: (content: string) => {
        const part = partsMap.get(activePartNumber);
        if (part) {
          part.thoughts.push(content);
          scheduleUpdate();
        }
      },
      onSearchQueries: (query: string) => {
        const part = partsMap.get(activePartNumber);
        if (part) {
          part.searchQueries.push(query);
          scheduleUpdate();
        }
      },
      onDeliverable: (content: string | SwotMatrixData) => {
        const part = partsMap.get(activePartNumber);
        if (part) {
          if (typeof content === 'object') {
            part.deliverable = content;
          } else {
            part.deliverable = (typeof part.deliverable === 'string' ? part.deliverable : '') + content + '\n';
          }
          scheduleUpdate();
        }
      },
      onComplete: () => {
        if (updateTimer) clearTimeout(updateTimer);

        const part5 = partsMap.get(5);
        if (part5 && typeof part5.deliverable === 'string') {
          const swotData = localParseSwotFromText(part5.deliverable);
          if (swotData) part5.deliverable = swotData;
        }

        const sortedParts = Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber);
        setAnalysisParts(sortedParts);
        setAnalysisComplete(true);
        setLoading(false);
        setCurrentPartNumber(0);

        const finalFacts = sessionStorage.getItem('legal_case_description') || lastSubmittedFileName;
        setSummarizedFacts(finalFacts);

        toast({
          title: 'Directive Generation Complete',
          description: 'The full legal directive is now available.',
          action: (
            <Button onClick={() => navigate('/chat')} className="legal-button-hover">
              Start Chat
            </Button>
          ),
        });
      },
      onError: (errorMsg: string) => {
        setError(errorMsg);
        setLoading(false);
        setHasStarted(false);
        toast({
          title: 'Directive Generation Failed',
          variant: 'destructive',
          description: errorMsg,
        });
      },
    });

    setStreamingClient(client);

    try {
      await client.streamDirective(caseFile, "Uploaded legal document", "Generate a comprehensive legal directive");
    } catch {
      setError('Failed to connect to analysis service');
      setLoading(false);
      setHasStarted(false);
    }
  };

  const chatCaseDescription = hasStarted
    ? (summarizedFacts || lastSubmittedFileName || 'Analyzing Document...')
    : (summarizedFacts || lastSubmittedFileName);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          {!hasStarted && !loading && analysisParts.length === 0 && (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">Upload Case Document for Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Upload your legal document (PDF, DOCX, TXT, JSON) to generate the 11-part War Game Directive.
              </p>

              <div className="flex items-center space-x-4">
                <input
                  id="case-file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".txt,.json,.pdf"
                  className="hidden"
                />
                <label
                  htmlFor="case-file-input"
                  className="cursor-pointer flex items-center justify-center p-4 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:border-primary transition-colors flex-grow"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {caseFile ? `File Selected: ${caseFile.name}` : 'Click to select file (PDF, TXT, JSON)'}
                </label>
                {caseFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  {caseFile ? `Size: ${(caseFile.size / 1024).toFixed(2)} KB` : 'No file selected'}
                </span>
                <Button type="submit" disabled={!caseFile || loading}>
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Uploading & Analyzing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Directive
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {(hasStarted || loading || analysisParts.length > 0) && (
            <div className="space-y-4">
              <SegmentedProgress currentPart={currentPartNumber} totalParts={11} isComplete={analysisComplete} />
              <ProfessionalLegalChat
                analysisParts={analysisParts}
                isStreaming={loading}
                isComplete={analysisComplete}
                caseDescription={chatCaseDescription}
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
                  setHasStarted(false);
                  setCaseFile(null);
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

export default UploadDocument;
