import React from 'react';
import { Brain, Search, FileText, Target, CheckCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MessageContent } from '@/components/MessageContent'; // Import the corrected MessageContent

interface DirectivePart {
  partNumber: number;
  partTitle: string;
  content: string;
}

interface StreamingAnalysisDisplayProps {
  content: string; // The deliverable content string
}

// REMOVAL OF: const renderContentWithLinks = (content: string) => {...}
// This is now handled robustly by MessageContent.

export const StreamingAnalysisDisplay: React.FC<StreamingAnalysisDisplayProps> = ({
  content,
}) => {
  // Mock part structure for simple display, as the complexity is in ProfessionalLegalChat
  // The content prop here is typically a single deliverable part content.

  if (!content || content.trim().length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">
          Content is currently streaming or empty.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* CRITICAL FIX: Delegate all content rendering to the robust MessageContent */}
      <MessageContent content={content} showCopyButton={false} />
    </div>
  );
};