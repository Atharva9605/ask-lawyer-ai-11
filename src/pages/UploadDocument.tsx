import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, Clock, StopCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData } from '@/lib/legalStreamAPI';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';
import { AnalysisState } from '@/pages/Analyze';
import SegmentedProgress from '@/components/SegmentedProgress';

const UploadDocument = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [caseDescription, setCaseDescription] = useState('');
  const [firstInstruction, setFirstInstruction] = useState('');
  
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [currentPart, setCurrentPart] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [client, setClient] = useState<LegalStreamingClient | null>(null);

  // Use refs to avoid stale closures
  const partsMapRef = useRef<Map<number, AnalysisState>>(new Map());
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activePartNumberRef = useRef<number>(0);

  const scheduleUpdate = useCallback(() => {
    if (updateTimerRef.current) return;
    updateTimerRef.current = setTimeout(() => {
      const parts = Array.from(partsMapRef.current.values()).sort((a, b) => a.partNumber - b.partNumber);
      setAnalysisParts(parts);
      updateTimerRef.current = null;
    }, 100);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file && !caseDescription.trim()) {
      toast({
        title: "Input Required",
        description: "Please upload a document or enter a case description.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    partsMapRef.current.clear();
    setAnalysisParts([]);
    setCurrentPart(0);
    setAnalysisComplete(false);
    activePartNumberRef.current = 0;

    const newClient = new LegalStreamingClient({
      onStart: () => {
        console.log('Streaming started...');
      },
      onConversationId: (id) => {
        console.log('Conversation ID:', id);
      },
      onDirectivePart: (partNumber) => {
        console.log('Part:', partNumber);
        activePartNumberRef.current = partNumber;
        setCurrentPart(partNumber);
        
        if (!partsMapRef.current.has(partNumber)) {
          partsMapRef.current.set(partNumber, {
            partNumber,
            internalReasoning: [],
            searchQueries: [],
            toolResults: [],
            deliverable: '',
          });
        }
      },
      onInternalReasoning: (content) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.internalReasoning.push(content);
          scheduleUpdate();
        }
      },
      onSearchQueries: (queries) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.searchQueries.push(...queries);
          scheduleUpdate();
        }
      },
      onToolResult: (query, content) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.toolResults.push({ query, content });
          scheduleUpdate();
        }
      },
      onDeliverable: (chunk) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          if (typeof part.deliverable === 'string') {
            part.deliverable += chunk;
          } else {
            part.deliverable = chunk;
          }
          scheduleUpdate();
        }
      },
      onComplete: (success) => {
        setLoading(false);
        setAnalysisComplete(success);
        if (success) {
          toast({
            title: "Analysis Complete",
            description: "The legal analysis has been generated successfully.",
          });
        }
      },
      onError: (errorMsg) => {
        setLoading(false);
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    });

    setClient(newClient);

    try {
      await newClient.startAnalysis(
        file,
        caseDescription,
        firstInstruction,
        undefined,
        undefined,
        undefined
      );
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleStop = () => {
    client?.close();
    setLoading(false);
    toast({
      title: "Analysis Stopped",
      description: "The analysis stream has been halted.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-5xl mx-auto px-6">
        <Link to="/" className="flex items-center text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Upload Document & Generate Analysis
        </h1>

        {!loading && !analysisComplete && (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2">Upload Document (Optional)</label>
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                disabled={loading}
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {file.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Case Description</label>
              <Textarea
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value)}
                placeholder="Describe your legal case, jurisdiction, and facts..."
                rows={6}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">First Instruction (Optional)</label>
              <Textarea
                value={firstInstruction}
                onChange={(e) => setFirstInstruction(e.target.value)}
                placeholder="Any specific instructions or focus areas..."
                rows={3}
                disabled={loading}
              />
            </div>

            <Button type="submit" size="lg" disabled={loading}>
              <Upload className="w-5 h-5 mr-2" />
              Generate Directive
            </Button>
          </form>
        )}

        {(loading || analysisParts.length > 0) && (
          <div className="mt-6 space-y-4">
            <SegmentedProgress
              currentPart={currentPart}
              totalParts={11}
              isComplete={analysisComplete}
            />
            {loading && (
              <div className="flex justify-end">
                <Button onClick={handleStop} variant="destructive" size="sm">
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Analysis
                </Button>
              </div>
            )}
            <ProfessionalLegalChat
              analysisParts={analysisParts}
              isStreaming={loading}
              isComplete={analysisComplete}
              caseDescription={caseDescription}
              currentPartNumber={currentPart}
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <p className="font-semibold mb-1">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDocument;
