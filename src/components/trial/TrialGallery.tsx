import React, { useEffect } from 'react';
import { Trial } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface TrialGalleryProps {
  trials: Trial[];
  selectedTrialId: string | null;
  onTrialSelect: (trialId: string) => void;
}

export const TrialGallery: React.FC<TrialGalleryProps> = ({
  trials,
  selectedTrialId,
  onTrialSelect,
}) => {
  // Debug logging
  useEffect(() => {
    console.log('🎭 TrialGallery rendering with:', {
      trialsCount: trials.length,
      trialIds: trials.map(t => t.id),
      selectedTrialId
    });
  }, [trials, selectedTrialId]);

  const handleTrialSelect = (trialId: string) => {
    console.log('🔍 Selecting trial:', trialId);
    onTrialSelect(trialId);
  };

  // Empty state
  if (trials.length === 0) {
    return (
      <div className="flex justify-center items-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No trials available. Run a trial to see results here.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="overflow-x-auto pb-4 pt-2 px-1 hide-scrollbar"
        ref={(ref) => {
          if (ref && selectedTrialId) {
            const selectedCard = ref.querySelector(`[data-trial-id="${selectedTrialId}"]`);
            if (selectedCard) {
              selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
          }
        }}
      >
        <div className="flex space-x-4 px-1">
          {trials.map((trial, index) => (
            <Card
              key={trial.id}
              data-trial-id={trial.id}
              onClick={() => handleTrialSelect(trial.id)}
              className={`flex-shrink-0 w-64 cursor-pointer transition-all origin-center hover:scale-105 ${
                trial.id === selectedTrialId ? 'ring-2 ring-primary shadow-lg' : 'shadow'
              }`}
            >
              <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">Trial #{index + 1}</CardTitle>
                  <CardDescription className="text-xs">{new Date(trial.timestamp).toLocaleTimeString()}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <span className="text-xs font-mono">{trial.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max:</span>
                    <span className="text-sm font-semibold">{trial.maxValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Mean:</span>
                    <span className="text-sm">{trial.sampleMean.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {trials.length > 3 && (
        <div className="absolute right-0 top-2 bottom-4 w-16 bg-gradient-to-l from-white pointer-events-none" />
      )}
    </div>
  );
};