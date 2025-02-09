import React, { useState, useMemo, useEffect, ReactNode, useCallback } from 'react';
import { ComposedChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ValueType, NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';
import { Bucket, TargetVersion, Trial } from "../types";
import { useVersionContext } from '../context/VersionContext';
import VersionNavigation from './VersionNavigation';
import { TrialControls } from "@/components/trial/TrialControls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { generateInitialState } from '@/lib/initialState';
import { useTrialGeneration } from '@/lib/trialGeneration';

interface SigmaLine {
    value: number;
    label: string;
}

interface ChartDataItem {
    value: number;
    expected: number;
    observed: number;
    range: string;
    sigma: string;
}

interface MaxValuePoint {
    x: number;
    y: number;
    opacity: number;
    trialId: string;
}

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
            if (initialVersions.length > 0) {
                setCurrentVersion(initialVersions[0].id);
            }
        }
    }, [initialSeed, setVersions, setCurrentVersion, versions]);

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

    const formatTooltip = (value: ValueType, name: NameType): [number | string, string] => {
        if (name === 'expected') {
            return [typeof value === 'number' ? value.toFixed(2) : 0, 'Expected Distribution'];
        }
        if (name === 'maxValues') {
            return [typeof value === 'number' ? value.toFixed(2) : 0, 'Trial Maximum'];
        }
        return [typeof value === 'number' ? value : 0, 'Observed Samples'];
    };

    const formatTooltipLabel = (_label: any, payload: Array<Payload<ValueType, NameType>>): ReactNode => {
        const item = payload[0]?.payload as ChartDataItem;
        if (!item) return '';
        return `Range: ${item.range}\nStandard Deviations from Mean: ${item.sigma}σ`;
    };

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

                            {/* Horizontally scrolling trial cards */}
                            <div className="relative">
                                {currentVersion && (
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
                                            {currentVersion.trials.map((trial, index) => (
                                                <Card
                                                    key={trial.id}
                                                    data-trial-id={trial.id}
                                                    onClick={() => setSelectedTrialId(trial.id)}
                                                    className={`flex-shrink-0 w-64 cursor-pointer transition-all origin-center hover:scale-105 ${trial.id === selectedTrialId ? 'ring-2 ring-primary' : ''
                                                        }`}
                                                >
                                                    <CardHeader className="p-4">
                                                        <div className="flex justify-between items-center">
                                                            <CardTitle className="text-sm">Trial #{index + 1}</CardTitle>
                                                            <CardDescription className="text-xs">{trial.id}</CardDescription>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="space-y-1">
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
                                )}
                                {currentVersion && currentVersion.trials.length > 3 && (
                                    <div className="absolute right-0 top-2 bottom-4 w-16 bg-gradient-to-l from-white pointer-events-none" />
                                )}
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Distribution Analysis</CardTitle>
                            </CardHeader>
                            <CardContent className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={chartData}
                                        margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="value"
                                            type="number"
                                            domain={domain}
                                            label={{ value: 'Benchmark Value', position: 'bottom', offset: 0 }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            label={{
                                                value: 'Count',
                                                angle: -90,
                                                position: 'insideLeft',
                                                offset: 10
                                            }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                        />
                                        <Tooltip<ValueType, NameType>
                                            formatter={formatTooltip}
                                            labelFormatter={formatTooltipLabel}
                                        />
                                        <Legend />

                                        <Bar
                                            id="expected-distribution"
                                            dataKey="expected"
                                            fill="#8884d8"
                                            opacity={0.5}
                                            name="expected"
                                            key={`expected-${selectedTrialId || 'all'}`}
                                            yAxisId="left"
                                        />

                                        {selectedTrial && (
                                            <Bar
                                                id="observed-distribution"
                                                dataKey="observed"
                                                fill="#82ca9d"
                                                opacity={0.8}
                                                name="observed"
                                                key={`observed-${selectedTrialId}`}
                                                yAxisId="right"
                                                offset={1}
                                            />
                                        )}

                                        {/* Debug logging */}
                                        {console.log('Max Value Points:', maxValuePoints)}

                                        {/* Render max value markers using ReferenceLines */}
                                        {maxValuePoints.map((point) => (
                                            <ReferenceLine
                                                key={point.trialId}
                                                x={point.x}
                                                yAxisId="left"
                                                stroke="#ff4444"
                                                strokeWidth={2}
                                                opacity={point.opacity}
                                                label={{
                                                    value: '×',
                                                    position: 'top',
                                                    fill: '#ff4444',
                                                    fontSize: 16,
                                                    opacity: point.opacity
                                                }}
                                            />
                                        ))}

                                        {sigmaLines.map(line => (
                                            <ReferenceLine
                                                key={line.label}
                                                yAxisId="left"
                                                x={line.value}
                                                stroke="#666"
                                                strokeDasharray="3 3"
                                                label={line.label}
                                                position="start"
                                            />
                                        ))}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="text-base">Reading the Chart</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-[#8884d8] opacity-50 rounded" />
                                        <span className="text-sm">Expected distribution</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-[#82ca9d] opacity-80 rounded" />
                                        <span className="text-sm">Current trial samples</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 flex items-center justify-center text-red-500 font-bold">×</div>
                                        <span className="text-sm">Maximum values (darker = newer)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            <div className="h-full w-0 border-l border-dashed border-gray-600"></div>
                                        </div>
                                        <span className="text-sm">Standard deviation boundaries (σ)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 flex items-center justify-center font-serif italic">μ</div>
                                        <span className="text-sm">Mean value</span>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-muted-foreground mt-2">
                                            The darker the maximum value marker (×), the more recent the trial. This helps track how maximum values evolve across trials.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default BenchmarkHistogram;
