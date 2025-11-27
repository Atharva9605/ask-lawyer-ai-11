import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface TimelineEvent {
  date: string;
  outcome: string;
  summary?: string;
}

interface CaseTimelineProps {
  events: TimelineEvent[];
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No hearing history available
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {events.map((event, index) => (
        <div key={index} className="relative pl-6 group">
          {/* Timeline Line */}
          {index < events.length - 1 && (
            <div className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-border group-hover:bg-primary/30 transition-colors" />
          )}
          
          {/* Timeline Dot */}
          <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-2 border-background group-hover:scale-125 transition-transform" />
          
          {/* Content */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {format(new Date(event.date), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {event.outcome}
            </div>
            {event.summary && (
              <div className="text-xs text-muted-foreground prose prose-sm max-w-none">
                <ReactMarkdown>{event.summary}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
