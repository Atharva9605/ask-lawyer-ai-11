import React from 'react';
import { SwotMatrixData } from '@/lib/legalStreamAPI';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SwotMatrixDisplayProps {
  data: SwotMatrixData;
}

export const SwotMatrixDisplay: React.FC<SwotMatrixDisplayProps> = ({ data }) => {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Strengths */}
        <Card className="relative overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center shadow-md">
                <span className="text-2xl">💪</span>
              </div>
              <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">{data.strength}</p>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="relative overflow-hidden border-2 border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20 hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500 dark:bg-rose-600 flex items-center justify-center shadow-md">
                <span className="text-2xl">⚠️</span>
              </div>
              <CardTitle className="text-lg font-bold text-rose-900 dark:text-rose-100">Weaknesses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm leading-relaxed text-rose-800 dark:text-rose-200">{data.weakness}</p>
          </CardContent>
        </Card>

        {/* Opportunities */}
        <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 dark:bg-blue-600 flex items-center justify-center shadow-md">
                <span className="text-2xl">🎯</span>
              </div>
              <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">Opportunities</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">{data.opportunity}</p>
          </CardContent>
        </Card>

        {/* Threats */}
        <Card className="relative overflow-hidden border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 dark:bg-amber-600 flex items-center justify-center shadow-md">
                <span className="text-2xl">⚡</span>
              </div>
              <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">Threats</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">{data.threat}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
