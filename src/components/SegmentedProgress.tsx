import React from 'react';

interface SegmentedProgressProps {
  currentPart: number;
  totalParts?: number;
  isComplete: boolean;
}

const SegmentedProgress: React.FC<SegmentedProgressProps> = ({ 
  currentPart, 
  totalParts = 11,
  isComplete 
}) => {
  const segments = Array.from({ length: totalParts }, (_, i) => i + 1);

  const partNames = [
    'Mission Briefing',
    'Legal Battlefield',
    'Asset Assessment',
    'Red Team',
    'SWOT Matrix',
    'Financial Exposure',
    'War Gaming',
    'Leverage Points',
    'Execution Roadmap',
    'Final Briefing',
    'Disclaimer'
  ];

  return (
    <div className="w-full space-y-3 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Analysis Progress
        </h3>
        <span className="text-xs font-bold text-primary">
          {isComplete ? '100%' : `${Math.round(((currentPart) / totalParts) * 100)}%`}
        </span>
      </div>

      {/* Progress bar with segments */}
      <div className="flex gap-1.5">
        {segments.map((segment) => {
          const isActive = segment === currentPart;
          const isCompleted = segment < currentPart || isComplete;
          const isPending = segment > currentPart && !isComplete;

          return (
            <div
              key={segment}
              className="relative group flex-1"
            >
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-primary/80 animate-pulse shadow-md shadow-primary/30'
                    : isCompleted
                    ? 'bg-primary/90'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className="bg-slate-900 dark:bg-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  <div className="font-semibold">Part {segment}</div>
                  <div className="text-slate-300 dark:text-slate-400 text-[10px]">{partNames[segment - 1]}</div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          {isComplete 
            ? '✓ Analysis Complete' 
            : currentPart > 0 
            ? `Processing: ${partNames[currentPart - 1]}` 
            : 'Initializing analysis...'}
        </span>
        <span className="text-slate-500 dark:text-slate-500">
          {currentPart > 0 ? `${currentPart} / ${totalParts}` : `0 / ${totalParts}`}
        </span>
      </div>
    </div>
  );
};

export default SegmentedProgress;