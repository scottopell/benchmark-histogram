import React, { useState, useMemo, useEffect, ReactNode, useCallback } from 'react';
import { ComposedChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ValueType, NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';
import { Bucket } from "../types";
import { useTrialGeneration } from '../hooks/useTrialGeneration';
import { useVersionContext } from '../context/VersionContext';
import VersionNavigation from './VersionNavigation';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

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

const BenchmarkTrials: React.FC = () => {
    const {
        currentVersion,
        addTrialToVersion,
        addVersion
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
        addVersion({
            name: `Version ${Date.now()}`,
        });
    }, [addVersion]);

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

        console.log('Processing buckets:', buckets);

        const computedDomain: [number, number] = [
            Math.min(...buckets.map(b => b.start)),
            Math.max(...buckets.map(b => b.end))
        ];

        const computedData = buckets.map(bucket => ({
            value: (bucket.start + bucket.end) / 2,
            expected: bucket.expected || 0,
            observed: bucket.observed || 0,
            range: `${bucket.start.toFixed(1)} - ${bucket.end.toFixed(1)}`,
            sigma: ((bucket.value - mean) / stdDev).toFixed(2)
        }));

        console.log('Computed chart data:', {
            domain: computedDomain,
            dataPoints: computedData.length
        });

        return [computedData, computedDomain];
    }, [currentVersion?.trials, selectedTrial, mean, stdDev]);

    // Add these useEffects near your other effects for debugging
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

            {/* Add the VersionNavigation component here */}
            <VersionNavigation />

            {/* Rest of your existing components */}
            <div className="space-y-6">
                <div className="w-full p-6 bg-white rounded-lg shadow">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold">Benchmark Trial Analysis</h2>
                        <p className="text-gray-600 mt-2">
                            Understand how sample size affects the reliability of your benchmark results
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Trial Controls and Cards */}
                        <div className="mb-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-x-4">
                                    <Button
                                        onClick={runTrial}
                                        disabled={isRunning}
                                        variant="default"
                                    >
                                        {isRunning ? 'Running Trial...' : 'Run New Trial'}
                                    </Button>
                                    <Button
                                        onClick={reset}
                                        variant="outline"
                                    >
                                        Reset All Trials
                                    </Button>

                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="w-48">
                                        <Label htmlFor="samplesPerTrial">Samples: {samplesPerTrial}</Label>
                                        <Slider
                                            id="samplesPerTrial"
                                            min={5}
                                            max={100}
                                            step={5}
                                            value={[samplesPerTrial]}
                                            onValueChange={([value]) => setSamplesPerTrial(value)}
                                        />
                                    </div>
                                    <div className="w-48">
                                        <label className="block text-sm font-medium mb-1" htmlFor="stdDev">
                                            σ: {stdDev}
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
                                    </div>
                                </div>
                            </div>

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

                        {/* Chart */}
                        <div className="h-96 w-full">
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
                                        label={{
                                            value: 'Count',
                                            angle: -90,
                                            position: 'insideLeft',
                                            offset: 10
                                        }}
                                    />
                                    <Tooltip<ValueType, NameType>
                                        formatter={formatTooltip}
                                        labelFormatter={formatTooltipLabel}
                                    />
                                    <Legend />

                                    <Bar
                                        dataKey="expected"
                                        fill="#8884d8"
                                        opacity={0.5}
                                        name="expected"
                                    />

                                    {selectedTrial && (
                                        <Bar
                                            dataKey="observed"
                                            fill="#82ca9d"
                                            opacity={0.8}
                                            name="observed"
                                        />
                                    )}

                                    {/* Debug logging */}
                                    {console.log('Max Value Points:', maxValuePoints)}

                                    {/* Render max value markers using ReferenceLines */}
                                    {maxValuePoints.map((point) => (
                                        <ReferenceLine
                                            key={point.trialId}
                                            x={point.x}
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
                                            x={line.value}
                                            stroke="#666"
                                            strokeDasharray="3 3"
                                            label={line.label}
                                            position="start"
                                        />
                                    ))}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-sm text-gray-600">
                                <h3 className="text-base font-semibold text-gray-900 mb-2">Reading the Chart:</h3>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                    <li>🟪 Purple bars: Expected distribution</li>
                                    <li>🟩 Green bars: Current trial samples</li>
                                    <li>❌ Red markers: Maximum values (darker = newer)</li>
                                    <li>⋮ Gray lines: Standard deviation boundaries</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BenchmarkTrials;