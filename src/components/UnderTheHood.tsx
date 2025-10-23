import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Search, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UnderTheHoodProps {
  internalReasoning: string[];
  searchQueries: string[];
  toolResults: Array<{ query: string; content: string }>;
}

export const UnderTheHood: React.FC<UnderTheHoodProps> = ({
  internalReasoning,
  searchQueries,
  toolResults,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if there's no content
  const hasContent = internalReasoning.length > 0 || searchQueries.length > 0 || toolResults.length > 0;
  if (!hasContent) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <Card className="border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                🔍 Sources & Reasoning (Under the Hood)
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
            {/* Internal Reasoning Section */}
            {internalReasoning.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Internal Reasoning
                  </h4>
                </div>
                <div className="space-y-2">
                  {internalReasoning.map((reasoning, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Queries Section */}
            {searchQueries.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Search className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Search Queries Performed
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchQueries.map((query, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg"
                    >
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {query}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tool Results Section */}
            {toolResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Research Results
                  </h4>
                </div>
                <div className="space-y-3">
                  {toolResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          Query: {result.query}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {result.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};