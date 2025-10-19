import React from 'react';
import { SwotMatrixData } from '@/lib/legalStreamAPI';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SwotMatrixDisplayProps {
  data: SwotMatrixData;
}

export const SwotMatrixDisplay: React.FC<SwotMatrixDisplayProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-300">Strengths</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-800 dark:text-green-200">{data.strength}</p>
        </CardContent>
      </Card>

      <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-300">Weaknesses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 dark:text-red-200">{data.weakness}</p>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-300">Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 dark:text-blue-200">{data.opportunity}</p>
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700">
        <CardHeader>
          <CardTitle className="text-yellow-700 dark:text-yellow-300">Threats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{data.threat}</p>
        </CardContent>
      </Card>
    </div>
  );
};
