import React, { useRef } from 'react';
import { FileText, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CaseFactsSummaryProps {
  caseFacts: string;
}

export const CaseFactsSummary: React.FC<CaseFactsSummaryProps> = ({ caseFacts }) => {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle various newline formats and create proper paragraphs
  const paragraphs = caseFacts
    .split(/\n\n+/)  // Split by double newlines for paragraphs
    .filter((para) => para.trim().length > 0)
    .map((para) => para.replace(/\n/g, '  \n'));  // Convert single newlines to markdown line breaks

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      toast({
        title: 'Generating PDF',
        description: 'Please wait...',
      });

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('case-facts-summary.pdf');

      toast({
        title: 'PDF Downloaded',
        description: 'Case facts summary exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <div ref={contentRef} className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <FileText size={20} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Case Facts Summary
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportPDF}
          className="text-white hover:bg-white/20 gap-2"
        >
          <Printer className="w-4 h-4" />
          Export PDF
        </Button>
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
