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

interface Hearing {
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
  onSelectHearing: (hearingNumber: number, action: 'directive' | 'chat') => void;
}

export const HearingSelectionModal: React.FC<HearingSelectionModalProps> = ({
  open,
  onClose,
  hearings,
  caseNumber,
  onSelectHearing,
}) => {
  const [selectedHearing, setSelectedHearing] = React.useState<number | null>(null);

  const handleHearingSelect = (hearingNumber: number) => {
    setSelectedHearing(hearingNumber);
  };

  const handleActionSelect = (action: 'directive' | 'chat') => {
    if (selectedHearing === null) return;
    onSelectHearing(selectedHearing, action);
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
              {hearings.map((hearing) => (
                <Card
                  key={hearing.hearing_number}
                  className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary/50"
                  onClick={() => handleHearingSelect(hearing.hearing_number)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                              {hearing.hearing_number}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">
                              Hearing #{hearing.hearing_number}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(hearing.date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        {hearing.outcome && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {hearing.outcome}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Action Selection */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Choose Action for Hearing #{selectedHearing}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHearing(null)}
                >
                  Change Hearing
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Read Directive Option */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary group"
                  onClick={() => handleActionSelect('directive')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-bold text-lg mb-2">Read Directive</h4>
                    <p className="text-sm text-muted-foreground">
                      View the complete generated directive as it was created
                    </p>
                  </CardContent>
                </Card>

                {/* Continue Chat Option */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary group"
                  onClick={() => handleActionSelect('chat')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-bold text-lg mb-2">Continue Chat</h4>
                    <p className="text-sm text-muted-foreground">
                      Resume the conversation from where you left off
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
