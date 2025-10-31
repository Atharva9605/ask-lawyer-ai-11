import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RotateCcw, FileText, Clock, StopCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData } from '@/lib/legalStreamAPI';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';
import SegmentedProgress from '@/components/SegmentedProgress';

// === SWOT PARSER (from your version, kept same) ===
const parseSwotFromText = (text: string): SwotMatrixData | null => {
  const lines = text.split('\n');
  const swot: Partial<SwotMatrixData> = {};
  const sectionMap: Record<string, keyof SwotMatrixData> = {
    strengths: 'strength',
    weaknesses: 'weakness',
    opportunities: 'opportunity',
    threats: 'threat',
  };

  let currentSection: keyof SwotMatrixData | null = null;
  let currentContent: string[] = [];

  const saveSection = () => {
    if (currentSection && currentContent.length > 0) {
      // store as array of lines to match SwotMatrixData string[] type
      swot[currentSection] = [...currentContent];
    }
    currentContent = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(STRENGTHS|WEAKNESSES|OPPORTUNITIES|THREATS)/i);
    if (match) {
      saveSection();
      currentSection = sectionMap[match[1].toLowerCase()] || null;
    } else if (currentSection) {
      currentContent.push(trimmed);
    }
  }
  saveSection();

  if (
    swot.strength && swot.weakness && swot.opportunity && swot.threat
  ) {
    return swot as SwotMatrixData;
  }
  return null;
};

export interface AnalysisState {
  partNumber: number;
  internalReasoning: string[];
  searchQueries: string[];
  toolResults: Array<{ query: string; content: string }>;
  deliverable: string | SwotMatrixData;
}

const Analyze = () => {
  const { toast } = useToast();
  const [caseDescription, setCaseDescription] = useState('');
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [currentPart, setCurrentPart] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [client, setClient] = useState<LegalStreamingClient | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseDescription.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a brief description of the case.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisParts([]);
    setCurrentPart(0);
    setAnalysisComplete(false);

    const newClient = new LegalStreamingClient({
      onStart: () => console.log('Streaming started...'),
      onDirectivePart: (partNumber) => setCurrentPart(partNumber),
      onDeliverable: (chunk) => {
        setAnalysisParts(prev => {
          const updated = [...prev];
          let last = updated[updated.length - 1];
          if (!last || last.partNumber !== currentPart) {
            last = {
              partNumber: currentPart,
              internalReasoning: [],
              searchQueries: [],
              toolResults: [],
              deliverable: '',
            };
            updated.push(last);
          }
          last.deliverable += chunk;
          updated[updated.length - 1] = last;
          return updated;
        });
      },
      onComplete: () => {
        setLoading(false);
        setAnalysisComplete(true);
        toast({
          title: "Analysis Complete",
          description: "All parts of the analysis have been generated successfully.",
        });
      },
      onError: (msg) => {
        setLoading(false);
        setError(msg);
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      }
    });

    setClient(newClient);

    try {
      await newClient.startAnalysis(
        null, // no file upload
        caseDescription,
        "",
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
          Professional Legal Analysis
        </h1>

        {!loading && !analysisComplete && (
          <form
            onSubmit={handleStart}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" /> Case Briefing
            </h2>
            <Textarea
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="Describe your legal case, jurisdiction, and facts..."
              rows={8}
              disabled={loading}
            />
            <Button type="submit" size="lg" disabled={loading}>
              <Clock className="w-5 h-5 mr-2" />
              Start Analysis
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
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setError(null);
                setCaseDescription('');
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyze;
