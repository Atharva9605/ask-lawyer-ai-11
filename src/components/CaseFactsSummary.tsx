import React from 'react';
import { FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CaseFactsSummaryProps {
  caseFacts: string;
}

export const CaseFactsSummary: React.FC<CaseFactsSummaryProps> = ({ caseFacts }) => {
  // Handle various newline formats and create proper paragraphs
  const paragraphs = caseFacts
    .split(/\n\n+/)  // Split by double newlines for paragraphs
    .filter((para) => para.trim().length > 0)
    .map((para) => para.replace(/\n/g, '  \n'));  // Convert single newlines to markdown line breaks

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">
          Case Facts Summary
        </h3>
      </div>
      
      {/* Content */}
      <div className="p-5">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          {paragraphs.map((paragraph, idx) => (
            <ReactMarkdown
              key={idx}
              components={{
                p: ({ node, ...props }) => (
                  <p
                    className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-2 last:mb-0"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <span className="font-semibold text-foreground" {...props} />
                ),
              }}
            >
              {paragraph}
            </ReactMarkdown>
          ))}
        </div>
      </div>
      
      {/* Decorative corner gradient */}
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-blue-600 to-cyan-600 opacity-5 rounded-tl-full pointer-events-none" />
    </div>
  );
};
