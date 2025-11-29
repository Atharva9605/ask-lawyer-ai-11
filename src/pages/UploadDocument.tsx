import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, FileText, Clock, Upload, X, ArrowLeft, Scale, Plus, Briefcase } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { LegalStreamingClient, SwotMatrixData, API_BASE_URL } from '@/lib/legalStreamAPI';
import { ProfessionalLegalChat } from '@/components/ProfessionalLegalChat';
import SegmentedProgress from '@/components/SegmentedProgress';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnalysisState } from '@/pages/Analyze';

const UploadDocument = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Form State
  const [uploadMode, setUploadMode] = useState<'new_case' | 'existing_case'>('new_case');
  const [existingCases, setExistingCases] = useState<any[]>([]);
  
  // New Case Fields
  const [caseTitle, setCaseTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  
  // Shared Fields
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [hearingDate, setHearingDate] = useState(new Date().toISOString().split('T')[0]);
  const [caseFile, setCaseFile] = useState<File | null>(null);
  
  // Processing State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisParts, setAnalysisParts] = useState<AnalysisState[]>([]);
  const [currentPartNumber, setCurrentPartNumber] = useState(0);
  const [streamingClient, setStreamingClient] = useState<LegalStreamingClient | null>(null);
  const [summarizedFacts, setSummarizedFacts] = useState('');

  // Fetch existing cases on mount
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setExistingCases(data.cases || []))
      .catch(err => console.error("Failed to fetch cases", err));
    }
    return () => streamingClient?.close();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setCaseFile(e.target.files[0]);
  };

  const createNewCase = async () => {
    const res = await fetch(`${API_BASE_URL}/cases`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        title: caseTitle,
        client_name: clientName,
        case_number: caseNumber
      })
    });
    
    if (!res.ok) throw new Error("Failed to create case");
    const data = await res.json();
    return data.case_id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseFile || !hearingDate) return;

    setLoading(true);
    setError(null);
    setHasStarted(false);
    setAnalysisParts([]);

    try {
      // 1. Get Case ID (Create new or use selected)
      let activeCaseId = selectedCaseId;
      
      if (uploadMode === 'new_case') {
        if (!caseTitle) {
          throw new Error("Case title is required");
        }
        activeCaseId = await createNewCase();
      }

      if (!activeCaseId) throw new Error("No Case ID selected");

      // 2. Start Streaming Analysis
      const partsMap = new Map<number, AnalysisState>();
      let activePartNumber = 0;

      const client = new LegalStreamingClient({
        onStart: () => setHasStarted(true),
        onConversationId: (id) => sessionStorage.setItem('legal_conversation_id', id),
        onDirectivePart: (num) => {
          activePartNumber = num;
          setCurrentPartNumber(num);
          if (!partsMap.has(num)) {
            partsMap.set(num, { partNumber: num, thoughts: [], searchQueries: [], deliverable: '' });
          }
          setAnalysisParts(Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber));
        },
        onThinking: (txt) => {
           const part = partsMap.get(activePartNumber);
           if(part) { part.thoughts.push(txt); setAnalysisParts([...partsMap.values()]); }
        },
        onSearchQueries: (q) => {
           const part = partsMap.get(activePartNumber);
           if(part) { part.searchQueries.push(...q); setAnalysisParts([...partsMap.values()]); }
        },
        onDeliverable: (content) => {
           const part = partsMap.get(activePartNumber);
           if(part) { 
             if (typeof content === 'string') part.deliverable = (part.deliverable as string) + content + '\n';
             else part.deliverable = content;
             setAnalysisParts(Array.from(partsMap.values()).sort((a, b) => a.partNumber - b.partNumber));
           }
        },
        onComplete: () => {
          setAnalysisComplete(true);
          setLoading(false);
          toast({ title: 'Analysis Complete', description: 'Directive generated successfully.' });
        },
        onError: (msg) => {
          setError(msg);
          setLoading(false);
        }
      });

      setStreamingClient(client);
      await client.startAnalysis(caseFile, activeCaseId, hearingDate, '', '', token || undefined);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            New Legal Analysis
          </h1>
        </div>

        {!hasStarted ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Left Column: Case Selection */}
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Case Details
                  </h3>
                  
                  <RadioGroup value={uploadMode} onValueChange={(v: any) => setUploadMode(v)} className="mb-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new_case" id="new" />
                      <Label htmlFor="new">Create New Case</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing_case" id="existing" disabled={existingCases.length === 0} />
                      <Label htmlFor="existing">Add to Existing Case</Label>
                    </div>
                  </RadioGroup>

                  {uploadMode === 'new_case' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Case Title *</Label>
                        <Input 
                          placeholder="e.g., State vs. John Doe" 
                          value={caseTitle}
                          onChange={e => setCaseTitle(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Input 
                          placeholder="Client Full Name" 
                          value={clientName}
                          onChange={e => setClientName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Case Number (Optional)</Label>
                        <Input 
                          placeholder="Court Case No." 
                          value={caseNumber}
                          onChange={e => setCaseNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>Select Case *</Label>
                      <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a case..." />
                        </SelectTrigger>
                        <SelectContent>
                          {existingCases.map((c: any) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.title || c.client_name || "Untitled"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Upload & Hearing Info */}
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Hearing & Documents
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Hearing Date *</Label>
                      <Input 
                        type="date" 
                        value={hearingDate}
                        onChange={e => setHearingDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Document (PDF/TXT) *</Label>
                      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${caseFile ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                        <input 
                          type="file" 
                          id="file" 
                          className="hidden" 
                          onChange={handleFileChange}
                          accept=".pdf,.txt,.json"
                        />
                        <label htmlFor="file" className="cursor-pointer block">
                          {caseFile ? (
                            <div className="flex items-center justify-center gap-2 text-primary font-medium">
                              <FileText className="w-5 h-5 flex-shrink-0" />
                              <span className="break-all text-sm">{caseFile.name}</span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Click to upload case files</p>
                            </div>
                          )}
                        </label>
                      </div>
                      {caseFile && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setCaseFile(null)} className="w-full text-destructive">
                          Remove File
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full" 
                  disabled={loading || !caseFile || (!caseTitle && uploadMode === 'new_case') || (!selectedCaseId && uploadMode === 'existing_case')}
                >
                  {loading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  {loading ? 'Generating Analysis...' : 'Generate Directive'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          // Analysis View
          <div className="space-y-6 animate-in fade-in duration-500">
            <SegmentedProgress currentPart={currentPartNumber} totalParts={11} isComplete={analysisComplete} />
            <ProfessionalLegalChat
              analysisParts={analysisParts}
              isStreaming={loading}
              isComplete={analysisComplete}
              caseDescription={caseFile?.name || "Document Analysis"}
              currentPartNumber={currentPartNumber}
            />
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDocument;
