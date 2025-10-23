// UploadDocument.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  RotateCcw,
  FileText,
  Clock,
  Upload,
  X,
  Send,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LegalStreamingClient, SwotMatrixData } from "@/lib/legalStreamAPI";
import { ProfessionalLegalChat } from "@/components/ProfessionalLegalChat";
import SegmentedProgress from "@/components/SegmentedProgress";
import { EnhancedLegalReferences } from "@/components/EnhancedLegalReferences";
import type { AnalysisState } from "@/pages/Analyze";
import { Textarea } from "@/components/ui/textarea"; // <-- ADDED: Required for text inputs

// Extend AnalysisState to include local processing fields
type LocalAnalysisState = AnalysisState & {
  thoughts: string[];
  searchQueries: string[];
  deliverable: string | SwotMatrixData;
  references?: string[];
  linkSummaries?: any[];
};

// Parse SWOT text sections from part 5 output (Preserving existing logic)
const localParseSwotFromText = (text: string): SwotMatrixData | null => {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const swot: Partial<SwotMatrixData> = {};

  let currentSection: "strength" | "weakness" | "opportunity" | "threat" | null =
    null;
  let currentContent: string[] = [];

  const saveSection = () => {
    if (currentSection && currentContent.length > 0) {
      (swot as SwotMatrixData)[currentSection] = currentContent; 
    }
    currentContent = [];
  };
  
  // NOTE: Minimal implementation based on common parsing patterns
  for (const line of lines) {
    if (line.startsWith('## Strength')) {
        saveSection();
        currentSection = 'strength';
    } else if (line.startsWith('## Weakness')) {
        saveSection();
        currentSection = 'weakness';
    } else if (line.startsWith('## Opportunity')) {
        saveSection();
        currentSection = 'opportunity';
    } else if (line.startsWith('## Threat')) {
        saveSection();
        currentSection = 'threat';
    } else if (currentSection && line.startsWith('-')) {
        currentContent.push(line.replace(/^- /, '').trim());
    }
  }
  saveSection();
  

  if (Object.keys(swot).length > 0) {
    return swot as SwotMatrixData;
  }
  return null;
};

const UploadDocument = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for required inputs (FIX FOR HTTP 422 ERROR)
  const [chatCaseDescription, setChatCaseDescription] = useState<string>(""); 
  const [initialInstruction, setInitialInstruction] = useState<string>(""); 
  const [lastSubmittedDescription, setLastSubmittedDescription] = useState<string>("");
  
  // State for file upload
  const [caseFile, setCaseFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for streaming analysis
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [analysisParts, setAnalysisParts] = useState<LocalAnalysisState[]>([]);
  const [currentPartNumber, setCurrentPartNumber] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // ... (file handlers omitted for brevity)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCaseFile(file);
      if (!chatCaseDescription.trim()) {
        setChatCaseDescription(file.name);
      }
    }
  };
  
  // Streaming state management (similar to Analyze.tsx)
  const partsMapRef = React.useRef(new Map<number, LocalAnalysisState>());
  const updateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePartNumberRef = React.useRef(0);

  const scheduleUpdate = React.useCallback(() => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      const sortedParts = Array.from(partsMapRef.current.values()).sort((a, b) => a.partNumber - b.partNumber);
      setAnalysisParts(sortedParts);
    }, 16); // 16ms for smooth 60fps updates
  }, []);
  
  const handleComplete = (success: boolean) => {
    setLoading(false);
    setAnalysisComplete(success);
  };

  const handleError = (message: string) => {
    setError(message);
    setLoading(false);
  };


  const handleSubmit = async () => {
    // 1. Validation (Crucial fix for 422 error)
    if (!chatCaseDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a Case Description.",
        variant: "destructive",
      });
      return;
    }

    if (!initialInstruction.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a Primary Strategic Objective.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset state and set loading
    setLoading(true);
    setHasStarted(true);
    setError(null);
    setAnalysisParts([]);
    setCurrentPartNumber(0);
    setAnalysisComplete(false);
    setLastSubmittedDescription(chatCaseDescription);
    
    // Clear refs
    partsMapRef.current.clear();
    activePartNumberRef.current = 0;

    // Create client with callbacks
    const client = new (LegalStreamingClient as any)({
      baseURL: 'https://legal-backend-api-chatbot.onrender.com',
      
      onStart: () => {
        console.log('Analysis started');
        setHasStarted(true);
      },

      onConversationId: (id: string) => {
        setConversationId(id);
        sessionStorage.setItem('legal_conversation_id', id);
      },

      onDirectivePart: (partNumber: number) => {
        activePartNumberRef.current = partNumber;
        setCurrentPartNumber(partNumber);
        if (!partsMapRef.current.has(partNumber)) {
          partsMapRef.current.set(partNumber, {
            partNumber,
            internalReasoning: [],
            searchQueries: [],
            toolResults: [],
            deliverable: '',
            thoughts: [],
            references: [],
            linkSummaries: []
          });
        }
        scheduleUpdate();
      },

      onInternalReasoning: (content: string) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.internalReasoning.push(content);
          scheduleUpdate();
        }
      },

      onSearchQueries: (queries: string[]) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          part.searchQueries.push(...queries);
          scheduleUpdate();
        }
      },

      onToolResult: (query: string, content: string) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          let result = part.toolResults.find(r => r.query === query);
          if (!result) {
            result = { query, content: '' };
            part.toolResults.push(result);
          }
          result.content += content + '\n';
          scheduleUpdate();
        }
      },

      onDeliverable: (content: string) => {
        const part = partsMapRef.current.get(activePartNumberRef.current);
        if (part) {
          if (typeof content === 'string') {
            part.deliverable = (typeof part.deliverable === 'string' ? part.deliverable : '') + content;
          } else {
            part.deliverable = content;
          }
          scheduleUpdate();
        }
      },

      onComplete: () => {
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        
        // Parse SWOT if it's part 5
        const part5 = partsMapRef.current.get(5);
        if (part5 && typeof part5.deliverable === 'string') {
          const swotData = localParseSwotFromText(part5.deliverable);
          if (swotData) {
            part5.deliverable = swotData;
          }
        }

        const sortedParts = Array.from(partsMapRef.current.values()).sort((a, b) => a.partNumber - b.partNumber);
        setAnalysisParts(sortedParts);
        setAnalysisComplete(true);
        setLoading(false);
        setCurrentPartNumber(0);

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

    try {
      await client.startAnalysis(
        caseFile,
        chatCaseDescription,
        initialInstruction
      );
    } catch (e) {
      setLoading(false);
      setHasStarted(false); 
      console.error("Submission failed:", e);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2 text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Start Legal War Game Directive
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             {/* Left Column: Input Form (New/Modified content) */}
            <div className="mb-6 p-6 border rounded-xl bg-white dark:bg-slate-900 shadow-lg sticky top-8">
                <h3 className="text-xl font-bold text-primary mb-4">Case Details & File Upload</h3>
                <div className="space-y-4">
                    {/* 1. Case Description Input */}
                    <div className="space-y-2">
                        <label htmlFor="case-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            1. Case Description
                        </label>
                        <Textarea 
                            id="case-description"
                            placeholder="Briefly summarize the case facts and parties..."
                            value={chatCaseDescription}
                            onChange={(e) => setChatCaseDescription(e.target.value)}
                            rows={2}
                            disabled={loading}
                        />
                    </div>
                    
                    {/* 2. Primary Strategic Objective Input */}
                    <div className="space-y-2">
                        <label htmlFor="first-instruction" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            2. Primary Strategic Objective
                        </label>
                        <Textarea 
                            id="first-instruction"
                            placeholder="What is the main goal for the AI? (e.g., Analyze, Defend, Settle)..."
                            value={initialInstruction}
                            onChange={(e) => setInitialInstruction(e.target.value)}
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    {/* 3. File Upload (Existing) */}
                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            3. Upload Supporting Document (Optional)
                        </label>
                         <input
                            type="file"
                            id="case-file"
                            accept=".pdf,.txt,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={loading}
                        />
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center">
{caseFile ? (
    <div className="flex items-center justify-between space-x-2 min-w-0 flex-1">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm truncate max-w-full min-w-0">
                {caseFile.name}
            </span>
        </div>
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setCaseFile(null)}
            disabled={loading}
            className="flex-shrink-0"
        >
            <X className="w-4 h-4 text-destructive" />
        </Button>
    </div>
) : (
                                <label htmlFor="case-file" className="cursor-pointer text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Click to select a file
                                </label>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    disabled={loading || isUploading || !chatCaseDescription.trim() || !initialInstruction.trim()}
                    className="mt-6 w-full gap-2"
                    size="lg"
                >
                    {loading ? (
                        <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                    {loading ? "Initializing Directive..." : "Start War Game Directive"}
                </Button>
            </div>

            {/* Error Box (From Snippet) */}
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
                        setStreamingClient(null);
                    }}
                    className="mt-2"
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                </Button>
            </div>
            )}
            
          </div>

          <div className="lg:col-span-2">
            {/* Right Column: Analysis Display (From Snippet) */}
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

                {analysisComplete && (
                  <EnhancedLegalReferences
                    references={analysisParts.flatMap(
                      (p: any) => p.references || []
                    )}
                    linkSummaries={analysisParts.flatMap(
                      (p: any) => p.linkSummaries || []
                    )}
                  />
                )}
              </div>
            )}

            {!hasStarted && !error && (
                <div className="mt-8 p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Legal Directive will appear here
                    </h4>
                    <p className="text-sm text-muted-foreground mt-2">
                        Enter your case details and objective in the left panel to begin the AI analysis.
                    </p>
                </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadDocument;

