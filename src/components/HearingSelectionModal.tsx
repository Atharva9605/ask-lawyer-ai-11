import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MessageSquare, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Hearing {
  hearing_id: string;
  hearing_number: number;
  date: string;
  outcome?: string;
  summary?: string;
}

interface HearingSelectionModalProps {
  open: boolean;
  onClose: () => void;
  hearings: Hearing[];
  caseNumber: string;
  isLoading: boolean;
}

export const HearingSelectionModal: React.FC<HearingSelectionModalProps> = ({
  open,
  onClose,
  hearings,
  caseNumber,
  isLoading,
}) => {
  const [selectedHearing, setSelectedHearing] = React.useState<Hearing | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleHearingSelect = (hearing: Hearing) => {
    setSelectedHearing(hearing);
  };

  const handleActionSelect = (action: 'directive' | 'chat') => {
    if (!selectedHearing) {
      toast({
        title: 'No hearing selected',
        description: 'Please pick a hearing first.',
        variant: 'destructive',
      });
      return;
    }

    const hearingId = selectedHearing.hearing_id;

    if (!hearingId) {
      toast({
        title: 'Invalid hearing',
        description: 'This hearing is missing an identifier.',
        variant: 'destructive',
      });
      return;
    }

    sessionStorage.setItem('legal_conversation_id', hearingId);

    if (action === 'directive') {
      navigate(`/directive?hearing_id=${hearingId}`);
    } else {
      navigate('/chat');
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Select Hearing</DialogTitle>
          <DialogDescription>
            Case: {caseNumber} - Choose a hearing to view its directive or continue the conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Hearing Selection */}
          {!selectedHearing ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Available Hearings
              </h3>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading hearings...</p>
              ) : hearings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hearings found for this case.
                </p>
              ) : (
                hearings.map((hearing) => (
                  <Card
                    key={hearing.hearing_id}
                    className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary/50"
                    onClick={() => handleHearingSelect(hearing)}
                  >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="text-xl font-bold text-primary">
                              #{hearing.hearing_number}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-foreground mb-1">
                              Hearing #{hearing.hearing_number}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(hearing.date), 'MMMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        {hearing.summary && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-sm text-foreground leading-relaxed">
                              {hearing.summary}
                            </p>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground ml-4 flex-shrink-0" />
                    </div>
                  </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Action Selection */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Hearing #{selectedHearing?.hearing_number}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose an action to proceed
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedHearing(null)}
                  className="gap-2"
                >
                  ← Back
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Read Directive Option */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary group"
                  onClick={() => handleActionSelect('directive')}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all group-hover:scale-110 duration-300">
                      <FileText className="w-10 h-10 text-primary" />
                    </div>
                    <h4 className="font-bold text-xl mb-2 text-foreground">Read Directive</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View the complete generated directive with full analysis and recommendations
                    </p>
                  </CardContent>
                </Card>

                {/* Continue Chat Option */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary group"
                  onClick={() => handleActionSelect('chat')}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all group-hover:scale-110 duration-300">
                      <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <h4 className="font-bold text-xl mb-2 text-foreground">Continue Chat</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Resume the conversation and ask follow-up questions about this hearing
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
