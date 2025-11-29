import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, Calendar, Loader2, Scale, Plus, ChevronDown, Clock, Edit, Eye, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, differenceInDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { HearingSelectionModal } from '@/components/HearingSelectionModal';
import { CaseTimeline } from '@/components/CaseTimeline';
import { API_BASE_URL } from '../lib/legalStreamAPI';

interface Hearing {
  date: string;
  outcome: string;
  summary?: string;
}

interface Case {
  _id: string;
  case_number?: string;
  client_name?: string;
  case_facts?: string;
  file_name?: string;
  created_at?: string;
  status?: string;
  opposing_party?: string;
  court_name?: string;
  next_hearing?: string;
  last_hearing_outcome?: string;
  hearing_history?: Hearing[];
}

const getStatusVariant = (status?: string): any => {
  if (!status) return 'pending';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('discovery')) return 'discovery';
  if (lowerStatus.includes('argument')) return 'arguments';
  if (lowerStatus.includes('judgment')) return 'judgment';
  if (lowerStatus.includes('closed')) return 'closed';
  return 'pending';
};

const getStatusLabel = (status?: string): string => {
  if (!status) return 'Pending';
  return status;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { toast } = useToast();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set());
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showHearingModal, setShowHearingModal] = useState(false);
  const [caseHearings, setCaseHearings] = useState<any[]>([]);
  const [isHearingsLoading, setIsHearingsLoading] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    const fetchCases = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/cases`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }

        const data = await response.json();
        setCases(data.cases || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load cases',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, [token, user, navigate, toast]);

  const handleCaseClick = async (caseItem: Case) => {
    if (!caseItem._id) return;
    setSelectedCase(caseItem);
    setShowHearingModal(true);

    if (!token) return;

    setIsHearingsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/cases/${caseItem._id}/hearings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch hearings');
      }

      const data = await response.json();
      setCaseHearings(data.hearings || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load hearings',
        variant: 'destructive',
      });
      setCaseHearings([]);
    } finally {
      setIsHearingsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowHearingModal(false);
    setSelectedCase(null);
    setCaseHearings([]);
    setIsHearingsLoading(false);
  };

  const toggleTimeline = (caseId: string | undefined) => {
    if (!caseId) return;
    
    setExpandedTimelines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const getHearingCountdown = (hearingDate?: string) => {
    if (!hearingDate) return null;
    try {
      const days = differenceInDays(new Date(hearingDate), new Date());
      if (days < 0) return 'Past hearing';
      if (days === 0) return 'Today';
      if (days === 1) return 'Tomorrow';
      return `in ${days} days`;
    } catch {
      return null;
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete?._id || !token) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/cases/${caseToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete case');
      }

      setCases((prev) => prev.filter((c) => c._id !== caseToDelete._id));
      
      toast({
        title: 'Case Deleted',
        description: 'The case has been successfully deleted',
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete case',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setCaseToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Professional Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scale className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">CaseMind</h1>
                <p className="text-xs text-muted-foreground font-medium">Legal Case Management</p>
              </div>
            </div>
            <Link to="/upload">
              <Button className="gap-2 shadow-sm font-semibold">
                <Plus className="w-4 h-4" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">
            Your Legal Cases
          </h2>
          <p className="text-muted-foreground">
            Comprehensive view of all active and archived case analyses
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Loading cases...</p>
            </div>
          </div>
        ) : cases.length === 0 ? (
          <Card className="text-center py-16 shadow-sm">
            <CardContent className="pt-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">No cases yet</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Begin your legal intelligence journey by uploading your first case document
              </p>
              <Link to="/upload">
                <Button size="lg" className="gap-2 font-semibold">
                  <Plus className="w-5 h-5" />
                  Create First Case
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cases.filter(c => c._id).map((caseItem) => (
              <Card key={caseItem._id} className="group hover:shadow-lg transition-all duration-300 border-border overflow-hidden">
                <CardContent className="p-0">
                  {/* Card Header */}
                  <div className="p-6 border-b bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-primary mb-1 tracking-wide uppercase">
                          {caseItem.case_number || (caseItem._id ? 'CV-2025-' + caseItem._id.slice(-3).toUpperCase() : 'CV-2025-NEW')}
                        </div>
                        <h3 className="text-lg font-bold text-foreground truncate">
                          {caseItem.client_name || caseItem.file_name || 'Untitled Case'}
                        </h3>
                      </div>
                      <Badge variant={getStatusVariant(caseItem.status)} className="ml-2 flex-shrink-0">
                        {getStatusLabel(caseItem.status)}
                      </Badge>
                    </div>
                    {caseItem.case_facts && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 border border-border/60 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span>Case facts summary captured</span>
                      </div>
                    )}
                  </div>

                  {/* Case Details */}
                  <div className="p-6 space-y-3 border-b">
                    {caseItem.opposing_party && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Opposing Party</span>
                        <span className="font-semibold text-foreground text-right">{caseItem.opposing_party}</span>
                      </div>
                    )}
                    {caseItem.court_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Court</span>
                        <span className="font-semibold text-foreground text-right">{caseItem.court_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Hearing Section */}
                  <div className="p-6 bg-accent/5 border-b">
                    {caseItem.next_hearing ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Hearing</span>
                          {getHearingCountdown(caseItem.next_hearing) && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {getHearingCountdown(caseItem.next_hearing)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-base font-bold text-foreground">
                          {format(new Date(caseItem.next_hearing), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No upcoming hearing scheduled</div>
                    )}
                    
                    {caseItem.last_hearing_outcome && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Last Outcome
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {caseItem.last_hearing_outcome}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline Section */}
                  {caseItem.hearing_history && Array.isArray(caseItem.hearing_history) && caseItem.hearing_history.length > 0 && (
                    <Collapsible
                      open={expandedTimelines.has(caseItem._id || '')}
                      onOpenChange={() => toggleTimeline(caseItem._id || '')}
                    >
                      <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors border-b">
                        <span className="text-sm font-semibold text-foreground">View Hearing Timeline</span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform ${
                            expandedTimelines.has(caseItem._id || '') ? 'rotate-180' : ''
                          }`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-6">
                        <CaseTimeline events={caseItem.hearing_history} />
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Footer Actions */}
                  <div className="p-4 flex items-center gap-2 border-t">
                    <Button
                      onClick={() => handleCaseClick(caseItem)}
                      variant="default"
                      size="sm"
                      className="flex-1 gap-2 font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Case
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({
                          title: 'Edit coming soon',
                          description: 'Case editing will be available in a future update.',
                        });
                      }}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaseToDelete(caseItem);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>

                  {/* Created Date Footer */}
                  {caseItem.created_at && (
                    <div className="px-6 pb-4 pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Created {format(new Date(caseItem.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Hearing Selection Modal */}
      {selectedCase && (
        <HearingSelectionModal
          open={showHearingModal}
          onClose={handleCloseModal}
          hearings={caseHearings.map((h, idx) => ({
            hearing_id: h.hearing_id || h._id || h.id || `hearing-${idx}`,
            hearing_number: idx + 1,
            date: h.hearing_date || h.date,
            summary: h.summary,
          }))}
          caseNumber={selectedCase.case_number || 'CV-2025-' + selectedCase._id?.slice(-3).toUpperCase()}
          isLoading={isHearingsLoading}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!caseToDelete} onOpenChange={(open) => !open && setCaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {caseToDelete?.client_name || caseToDelete?.file_name || 'this case'}? This action cannot be undone and will permanently remove all associated data including hearings and directives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCase}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Case'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
