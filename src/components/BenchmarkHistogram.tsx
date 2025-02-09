// BenchmarkHistogram.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Bucket, TargetVersion, Trial } from "../types";
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
    const {
        versions,
        currentVersion,
        setVersions,
        setCurrentVersion
    } = useVersionContext();

    const [mean] = useState<number>(100);
    const [stdDev, setStdDev] = useState<number>(10);
    const [tailProbability] = useState<number>(0.01);
    const [tailShift] = useState<number>(3);
    const [samplesPerTrial, setSamplesPerTrial] = useState<number>(initialSamplesPerTrial);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);

    const { generateTrial } = useTrialGeneration({
        mean,
        stdDev,
        tailShift,
        tailProbability,
        samplesPerTrial,
    });

    useEffect(() => {
        // Only initialize if versions are empty
        if (!versions || versions.length === 0) {
            const initialVersions = generateInitialState(initialSeed);
            setVersions(initialVersions);
        }
    }, [initialSeed, setVersions, versions]);

    const addTrialToVersion = useCallback((versionId: string, newTrial: Trial) => {
        if (!versions) return;
        const updatedVersions = versions.map((version: TargetVersion) => {
            if (version.id === versionId) {
                return {
                    ...version,
                    trials: [...version.trials, newTrial]
                };
            }
            return version;
        });
        setVersions(updatedVersions);
    }, [versions, setVersions]);

    // When version id changes, auto-select the latest trial
    useEffect(() => {
        if (currentVersion) {
            const latestTrial = currentVersion.trials[currentVersion.trials.length - 1];
            setSelectedTrialId(latestTrial?.id || null);
        } else {
            setSelectedTrialId(null);
        }
    }, [currentVersion?.id]);

    const runTrial = useCallback(async (): Promise<void> => {
        console.log('Run trial called', { currentVersion, isRunning });
        if (!currentVersion || isRunning) return;

        setIsRunning(true);
        try {
            console.log('Generating trial for version:', currentVersion.id);
            const newTrial = generateTrial(currentVersion.id);
            console.log('Generated trial:', newTrial);

            if (!newTrial.buckets || newTrial.buckets.length === 0) {
                throw new Error('Generated trial has no buckets');
            }

            addTrialToVersion(currentVersion.id, newTrial);
            setSelectedTrialId(newTrial.id);

            // Verify the trial was added
            console.log('Current version after adding trial:', currentVersion);
        } catch (error) {
            console.error('Error in runTrial:', error);
        } finally {
            setTimeout(() => setIsRunning(false), 500);
        }
    }, [currentVersion, isRunning, generateTrial, addTrialToVersion]);

    const reset = useCallback((): void => {
        const initialVersions = generateInitialState(initialSeed);
        setVersions(initialVersions);
        if (initialVersions.length > 0) {
            setCurrentVersion(initialVersions[0].id);
        }
    }, [initialSeed, setVersions, setCurrentVersion]);

    const generateSigmaLines = (mean: number, stdDev: number): SigmaLine[] => [
        { value: mean, label: 'μ' },
        { value: mean - stdDev, label: '-σ' },
        { value: mean + stdDev, label: '+σ' },
        { value: mean - 2 * stdDev, label: '-2σ' },
        { value: mean + 2 * stdDev, label: '+2σ' }
    ];

    const sigmaLines = useMemo(() =>
        generateSigmaLines(mean, stdDev),
        [mean, stdDev]
    );

    const selectedTrial = useMemo(() => {
        if (currentVersion === null || selectedTrialId === null) {
            return null;
        }
        let maybeSelectedTrial = currentVersion.trials.find((t) => t.id == selectedTrialId);
        if (maybeSelectedTrial === undefined) {
            // Can occur as a state race when setting selected trial and data being generated
            return null;
        }
        return maybeSelectedTrial;
    }, [currentVersion?.trials, selectedTrialId]);

    const maxValuePoints = useMemo((): MaxValuePoint[] => {
        if (currentVersion === null) {
            return [];
        }
        return currentVersion.trials.map((trial, idx) => ({
            x: trial.maxValue,
            y: 0,
            opacity: 0.3 + (0.7 * (idx / Math.max(1, currentVersion.trials.length - 1))),
            trialId: trial.id
        }));
    }, [currentVersion?.trials]);

    const [chartData, domain] = useMemo((): [ChartDataItem[], [number, number]] => {
        console.log('Computing chart data', {
            currentVersion,
            selectedTrial,
            selectedTrialId
        });

        if (!currentVersion) {
            console.log('No current version');
            return [[], [0, 1]];
        }

        let buckets: Bucket[] = [];
        if (selectedTrial && selectedTrial.buckets) {
            console.log('Using selected trial buckets');
            buckets = selectedTrial.buckets;
        } else if (currentVersion.trials.length > 0) {
            console.log('Using all trials buckets');
            buckets = currentVersion.trials.map(t => t.buckets || []).flat();
        }

        if (buckets.length === 0) {
            console.log('No buckets available for charting');
            return [[], [0, 1]];
        }

        const computedDomain: [number, number] = [
            Math.min(...buckets.map(b => b.start)),
            Math.max(...buckets.map(b => b.end))
        ];

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
    }, [currentVersion?.trials, selectedTrial, mean, stdDev]);

    useEffect(() => {
        console.log('Current Version State:', {
            id: currentVersion?.id,
            trialsCount: currentVersion?.trials.length,
            trials: currentVersion?.trials
        });
    }, [currentVersion]);

    useEffect(() => {
        console.log('Selected Trial State:', {
            selectedTrialId,
            trial: selectedTrial,
            buckets: selectedTrial?.buckets
        });
    }, [selectedTrialId, selectedTrial]);

    useEffect(() => {
        console.log('Chart Data State:', {
            chartData,
            domain,
            maxValuePoints
        });
    }, [chartData, domain, maxValuePoints]);

    return (
        <div className="w-full p-6 bg-white rounded-lg shadow">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Benchmark Trial Analysis</h2>
                <p className="text-gray-600 mt-2">
                    Understand how sample size affects the reliability of your benchmark results
                </p>
            </div>

            <VersionNavigation />

            <div className="space-y-6">
                <div className="w-full p-6 bg-white rounded-lg shadow">
                    <div className="space-y-6">
                        {/* Trial Controls and Cards */}
                        <div>
                            <TrialControls
                                onRunTrial={runTrial}
                                onReset={reset}
                                isRunning={isRunning}
                                samplesPerTrial={samplesPerTrial}
                                onSamplesChange={setSamplesPerTrial}
                                stdDev={stdDev}
                                onStdDevChange={setStdDev}
                            />

                            {currentVersion && (
                                <TrialGallery
                                    trials={currentVersion.trials}
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
        </div >
    );
};

export default BenchmarkHistogram;
