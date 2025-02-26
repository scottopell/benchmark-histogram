// BenchmarkHistogram.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Bucket } from "../types";
import { useVersionContext } from '../context/VersionContext';
import VersionNavigation from './VersionNavigation';
import { TrialControls } from "@/components/trial/TrialControls"
import { generateInitialState } from '@/lib/initialState';
import { useTrialGeneration } from '@/lib/trialGeneration';
import { DistributionChart, ChartDataItem, MaxValuePoint, SigmaLine, DistributionChartGuide } from './visualization/DistributionChart';
import { TrialGallery } from './trial/TrialGallery';

const initialSamplesPerTrial = 20;

interface BenchmarkHistogramProps {
  initialSeed?: number;
}

const BenchmarkHistogram: React.FC<BenchmarkHistogramProps> = ({
  initialSeed = 12345
}) => {
  // Get context methods and state
  const {
    versions,
    currentVersion,
    initialize,
    addTrial,
    resetApp,
    getCurrentTrials,
    getTrialById
  } = useVersionContext();

  // Local component state
  const [mean] = useState<number>(100);
  const [stdDev, setStdDev] = useState<number>(10);
  const [tailProbability] = useState<number>(0.01);
  const [tailShift] = useState<number>(3);
  const [samplesPerTrial, setSamplesPerTrial] = useState<number>(initialSamplesPerTrial);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);

  // Get trial generation hook
  const { generateTrial } = useTrialGeneration({
    mean,
    stdDev,
    tailShift,
    tailProbability,
    samplesPerTrial,
  });

  // Initialize app on first load
  useEffect(() => {
    // Only initialize if versions are empty
    if (!versions || versions.length === 0) {
      console.log('🚀 Initializing app with seed:', initialSeed);
      const initialVersions = generateInitialState(initialSeed);
      initialize(initialVersions);
    }
  }, [initialSeed, initialize, versions]);

  // Auto-select the latest trial when current version changes
  useEffect(() => {
    if (currentVersion && currentVersion.trials.length > 0) {
      const latestTrial = currentVersion.trials[currentVersion.trials.length - 1];
      console.log('Auto-selecting latest trial:', latestTrial?.id);
      setSelectedTrialId(latestTrial?.id || null);
    } else {
      console.log('No current version or no trials, clearing selected trial ID');
      setSelectedTrialId(null);
    }
  }, [currentVersion]);

  // Function to run a new trial
  const runTrial = useCallback(async (): Promise<void> => {
    console.log('Run trial called', { currentVersionId: currentVersion?.id, isRunning });
    if (!currentVersion || isRunning) return;

    setIsRunning(true);
    try {
      console.log('Generating trial for version:', currentVersion.id);
      
      // Generate a new trial
      const newTrial = generateTrial(currentVersion.id);
      console.log('Generated trial:', newTrial.id);

      if (!newTrial?.buckets || newTrial.buckets.length === 0) {
        console.error('Trial has no buckets', newTrial);
        throw new Error('Generated trial has no buckets');
      }

      // Add the trial to the version using context action
      addTrial(currentVersion.id, newTrial);
      
      // Set the selected trial ID to show the new trial
      console.log('Setting selected trial ID to:', newTrial.id);
      setSelectedTrialId(newTrial.id);
    } catch (error) {
      console.error('Error in runTrial:', error);
    } finally {
      setTimeout(() => setIsRunning(false), 500);
    }
  }, [currentVersion, isRunning, generateTrial, addTrial]);

  // Reset app to initial state
  const reset = useCallback((): void => {
    console.log('Resetting app with seed:', initialSeed);
    const initialVersions = generateInitialState(initialSeed);
    resetApp(initialVersions);
  }, [initialSeed, resetApp]);

  // Generate sigma lines for the chart
  const generateSigmaLines = useCallback((mean: number, stdDev: number): SigmaLine[] => [
    { value: mean, label: 'μ' },
    { value: mean - stdDev, label: '-σ' },
    { value: mean + stdDev, label: '+σ' },
    { value: mean - 2 * stdDev, label: '-2σ' },
    { value: mean + 2 * stdDev, label: '+2σ' }
  ], []);

  // Memoized sigma lines
  const sigmaLines = useMemo(() => 
    generateSigmaLines(mean, stdDev),
    [mean, stdDev, generateSigmaLines]
  );

  // Get current trials
  const currentTrials = useMemo(() => 
    getCurrentTrials(),
    [getCurrentTrials]
  );

  // Get currently selected trial
  const selectedTrial = useMemo(() => {
    if (!selectedTrialId) return null;
    
    const trial = getTrialById(selectedTrialId);
    console.log('Selected trial lookup:', {
      id: selectedTrialId,
      found: !!trial,
      versionId: trial?.targetVersionId
    });
    
    return trial;
  }, [selectedTrialId, getTrialById]);

  // Generate max value points for the chart
  const maxValuePoints = useMemo((): MaxValuePoint[] => {
    if (!currentTrials.length) return [];
    
    return currentTrials.map((trial, idx) => ({
      x: trial.maxValue,
      y: 0,
      opacity: 0.3 + (0.7 * (idx / Math.max(1, currentTrials.length - 1))),
      trialId: trial.id
    }));
  }, [currentTrials]);

  // Calculate chart data from buckets
  const [chartData, domain] = useMemo((): [ChartDataItem[], [number, number]] => {
    console.log('Computing chart data', {
      selectedTrialId,
      hasSelectedTrial: !!selectedTrial,
      trialsCount: currentTrials.length,
      hasBuckets: selectedTrial && selectedTrial.buckets ? selectedTrial.buckets.length > 0 : false
    });

    if (!currentVersion) {
      return [[], [0, 1]];
    }

    // Get buckets from selected trial or all trials
    let buckets: Bucket[] = [];
    if (selectedTrial && selectedTrial.buckets && selectedTrial.buckets.length > 0) {
      console.log('Using selected trial buckets');
      buckets = selectedTrial.buckets;
    } else if (currentTrials.length > 0) {
      console.log('Using all trials buckets');
      buckets = currentTrials
        .filter(t => t.buckets && t.buckets.length > 0)
        .map(t => t.buckets)
        .flat();
    }

    if (buckets.length === 0) {
      console.log('No buckets available for charting');
      return [[], [0, 1]];
    }

    // Calculate domain from buckets
    const computedDomain: [number, number] = [
      Math.min(...buckets.map(b => b.start)),
      Math.max(...buckets.map(b => b.end))
    ];

    // Convert buckets to chart data format
    const computedData = buckets.map((bucket, index) => {
      const centerValue = (bucket.start + bucket.end) / 2;
      // Add a tiny fractional offset based on array position
      // Small enough to not affect visual display but ensure unique coordinates
      const uniqueOffset = index * 0.000001;

      return {
        id: `${bucket.start}-${bucket.end}-${index}-${selectedTrialId || 'all'}`,
        value: centerValue + uniqueOffset,
        expected: bucket.expected || 0 + uniqueOffset,
        observed: bucket.observed || 0 + 2 * uniqueOffset,
        range: `${bucket.start.toFixed(1)} - ${bucket.end.toFixed(1)}`,
        sigma: ((bucket.value - mean) / stdDev).toFixed(2)
      };
    });

    return [computedData, computedDomain];
  }, [currentTrials, currentVersion, selectedTrial, selectedTrialId, mean, stdDev]);

  // Debug logging for important state changes
  useEffect(() => {
    if (currentVersion) {
      console.log('Current Version State:', {
        id: currentVersion.id,
        trialsCount: currentVersion.trials.length
      });
    }
  }, [currentVersion]);

  useEffect(() => {
    console.log('Selected Trial State:', {
      selectedTrialId,
      trialFound: !!selectedTrial
    });
  }, [selectedTrialId, selectedTrial]);

  // Render the app
  return (
    <div className="w-full p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Benchmark Trial Analysis</h2>
        <p className="text-gray-600 mt-2">
          Understand how sample size affects the reliability of your benchmark results
        </p>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-2/3">
            <VersionNavigation />
          </div>
          <div className="flex items-center space-x-2 md:justify-end">
            <button
              onClick={() => {
                const settingsPanel = document.getElementById('settings-panel');
                if (settingsPanel) {
                  settingsPanel.classList.toggle('hidden');
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Settings
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Application
            </button>
          </div>
        </div>
      </div>
      
      <div id="settings-panel" className="mb-6 p-4 bg-gray-100 rounded-lg shadow-inner hidden">
        <h3 className="text-lg font-medium mb-4">Application Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="samplesPerTrial">
              Samples per Trial: {samplesPerTrial}
            </label>
            <input
              id="samplesPerTrial"
              type="range"
              min="5"
              max="100"
              step="5"
              value={samplesPerTrial}
              onChange={(e) => setSamplesPerTrial(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">Controls the number of data points in each trial</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="stdDev">
              Standard Deviation (σ): {stdDev}
            </label>
            <input
              id="stdDev"
              type="range"
              min="1"
              max="30"
              step="1"
              value={stdDev}
              onChange={(e) => setStdDev(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">Controls the spread of the distribution</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="w-full p-6 bg-white rounded-lg shadow">
          <div className="space-y-6">
            {/* Trial Controls and Cards */}
            <div>
              <TrialControls
                onRunTrial={runTrial}
                isRunning={isRunning}
              />

              {currentVersion && (
                <TrialGallery
                  trials={currentTrials}
                  selectedTrialId={selectedTrialId}
                  onTrialSelect={setSelectedTrialId}
                />
              )}
            </div>

            <DistributionChart
              chartData={chartData}
              domain={domain}
              maxValuePoints={maxValuePoints}
              sigmaLines={sigmaLines}
              selectedTrialId={selectedTrialId}
            />

            <DistributionChartGuide />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkHistogram;
