import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="glass-panel p-4 rounded-3xl border border-white/60 relative overflow-hidden">
      <div className="animate-pulse flex items-start justify-between gap-3">
        <div className="flex gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gray-200/70" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-gray-200/70 rounded w-3/4" />
            <div className="h-3 bg-gray-200/70 rounded w-1/2" />
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
            <div className="h-5 bg-gray-200/70 rounded w-16" />
            <div className="h-3 bg-gray-200/70 rounded w-10" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
        <div className="h-8 w-8 rounded-full bg-gray-200/70" />
        <div className="h-3 w-12 rounded bg-gray-200/70" />
      </div>
    </div>
  );
};