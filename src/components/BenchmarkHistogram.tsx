import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { generateId } from "../id";

interface Bucket {
    start: number;
    end: number;
    expected: number;
    observed: number;
    value: number;
}

interface Trial {
    id: string;
    buckets: Bucket[];
    maxValue: number;
    timestamp: number;
    sampleMean: number;
}

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

// Simple xorshift for deterministic random numbers
const xorshift = (seed: number): () => number => {
    let state = seed;
    return () => {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
};

const generateTrialId = (): string => {
    let id = generateId();
    return id;
};

const generateSeedFromId = (id: string): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

// Error function implementation
const erf = (x: number): number => {
    const sign = Math.sign(x);
    x = Math.abs(x);
    const t = 1.0 / (1.0 + 0.3275911 * x);
    const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
};

const calculateBucketsAndDomain = (mean: number, stdDev: number, tailShift: number,
    tailProbability: number, samplesPerTrial: number) => {
    const minX = mean - 4 * stdDev;
    const maxX = mean + (tailShift + 2) * stdDev;
    const domain: [number, number] = [minX, maxX];
    const numBuckets = 30;
    const bucketSize = (maxX - minX) / numBuckets;

    const buckets: Bucket[] = Array(numBuckets).fill(0).map((_, i) => {
        const start = minX + i * bucketSize;
        const end = minX + (i + 1) * bucketSize;
        const centerValue = (start + end) / 2;

        const mainProb = (1 - tailProbability) * (
            (erf((end - mean) / (Math.sqrt(2) * stdDev)) -
                erf((start - mean) / (Math.sqrt(2) * stdDev))) / 2
        );

        const tailProb = tailProbability * (
            (erf((end - (mean + tailShift * stdDev)) / (Math.sqrt(2) * stdDev)) -
                erf((start - (mean + tailShift * stdDev)) / (Math.sqrt(2) * stdDev))) / 2
        );

        const totalProb = mainProb + tailProb;
        const expected = totalProb * samplesPerTrial;

        return {
            start,
            end,
            expected,
            observed: 0,
            value: centerValue
        };
    });

    return { domain, buckets, bucketSize };
};

const generateSample = (
    rng: () => number,
    mean: number,
    stdDev: number,
    tailShift: number,
    tailProbability: number
): number => {
    const u1 = rng();
    const u2 = rng();
    if (u1 < tailProbability) {
        const z = Math.sqrt(-2 * Math.log(u2)) * Math.cos(2 * Math.PI * rng());
        return mean + tailShift * stdDev + z * stdDev;
    } else {
        const z = Math.sqrt(-2 * Math.log(u2)) * Math.cos(2 * Math.PI * rng());
        return mean + z * stdDev;
    }
};

const initializeTrial = (
    mean: number,
    stdDev: number,
    tailShift: number,
    tailProbability: number,
    samplesPerTrial: number
): Trial => {
    const id = generateTrialId();
    const rng = xorshift(generateSeedFromId(id));

    const { domain, buckets, bucketSize } =
        calculateBucketsAndDomain(mean, stdDev, tailShift, tailProbability, samplesPerTrial);

    const samples = Array(samplesPerTrial).fill(0).map(() =>
        generateSample(rng, mean, stdDev, tailShift, tailProbability)
    );

    const maxValue = Math.max(...samples);
    const sampleMean = samples.reduce((a, b) => a + b, 0) / samples.length;

    samples.forEach(value => {
        const bucketIndex = Math.floor((value - domain[0]) / bucketSize);
        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
            buckets[bucketIndex].observed++;
        }
    });

    return { id, buckets, maxValue, timestamp: Date.now(), sampleMean };
};

const initialSamplesPerTrial = 20;

const BenchmarkTrials: React.FC = () => {
    const [mean] = useState<number>(100);
    const [stdDev, setStdDev] = useState<number>(10);
    const [tailProbability] = useState<number>(0.01);
    const [tailShift] = useState<number>(3);
    const [samplesPerTrial, setSamplesPerTrial] = useState<number>(initialSamplesPerTrial);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    const [trials, setTrials] = useState<Trial[]>(() => [
        initializeTrial(mean, stdDev, tailShift, tailProbability, samplesPerTrial)
    ]);

    const [selectedTrialId, setSelectedTrialId] = useState<string>(() => trials[0]?.id || '');

    const currentTrial = useMemo(() =>
        trials.find(t => t.id === selectedTrialId) || trials[trials.length - 1],
        [trials, selectedTrialId]
    );

    const { domain, buckets, bucketSize } =
        calculateBucketsAndDomain(mean, stdDev, tailShift, tailProbability, samplesPerTrial);

    const runTrial = (): void => {
        if (!buckets) return;
        setIsRunning(true);

        const trialId = generateTrialId();
        const rng = xorshift(generateSeedFromId(trialId));

        const newBuckets = buckets.map(bucket => ({ ...bucket, observed: 0 }));
        const samples = Array(samplesPerTrial).fill(0).map(() =>
            generateSample(rng, mean, stdDev, tailShift, tailProbability)
        );
        const maxValue = Math.max(...samples);
        const sampleMean = samples.reduce((a, b) => a + b, 0) / samples.length;

        samples.forEach(value => {
            const bucketIndex = Math.floor((value - domain[0]) / bucketSize);
            if (bucketIndex >= 0 && bucketIndex < newBuckets.length) {
                newBuckets[bucketIndex].observed++;
            }
        });

        const trial: Trial = {
            id: trialId,
            buckets: newBuckets,
            maxValue,
            timestamp: Date.now(),
            sampleMean
        };

        setTrials(prev => [...prev.slice(-4), trial]);
        setSelectedTrialId(trialId);

        setTimeout(() => setIsRunning(false), 500);
    };

    const reset = (): void => {
        setTrials([]);
        // TODO save / derive / hardcode an initial ID
        setSelectedTrialId(generateId());
    };

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

    const chartData = useMemo((): ChartDataItem[] => {
        return (currentTrial?.buckets || buckets).map(bucket => ({
            value: (bucket.start + bucket.end) / 2,
            expected: bucket.expected || 0,
            observed: bucket.observed || 0,
            range: `${bucket.start.toFixed(1)} - ${bucket.end.toFixed(1)}`,
            sigma: ((bucket.value - mean) / stdDev).toFixed(2)
        }));
    }, [currentTrial, buckets, mean, stdDev]);

    const formatTooltip = (value: ValueType, name: NameType): [number | string, string] => {
        if (name === 'expected') {
            return [typeof value === 'number' ? value.toFixed(2) : 0, 'Expected Distribution'];
        }
        return [typeof value === 'number' ? value : 0, 'Observed Samples'];
    };

    const formatTooltipLabel = (label: any, payload: Array<{ payload: ChartDataItem }>): string => {
        const item = payload[0]?.payload;
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

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" htmlFor="samplesPerTrial">
                            Samples per Trial: {samplesPerTrial}
                            <span className="text-gray-500 text-xs ml-2">
                                (Higher = more reliable estimates)
                            </span>
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
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium" htmlFor="stdDev">
                            Variability (σ): {stdDev}
                            <span className="text-gray-500 text-xs ml-2">
                                (Natural variation in measurements)
                            </span>
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

                <div className="flex space-x-4">
                    <button
                        onClick={runTrial}
                        disabled={isRunning}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isRunning ? 'Running Trial...' : 'Run New Trial'}
                    </button>
                    <button
                        onClick={reset}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Reset All Trials
                    </button>
                </div>

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

                            {currentTrial && (
                                <Bar
                                    dataKey="observed"
                                    fill="#82ca9d"
                                    opacity={0.8}
                                    name="observed"
                                />
                            )}

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
                    <h3 className="text-lg font-semibold mb-2">Trial Insights:</h3>
                    {currentTrial && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium">Current Trial Statistics</h4>
                                    <p className="text-sm">
                                        Trial ID: <span className="font-mono">{currentTrial.id}</span>
                                        <br />
                                        Maximum Value: <span className="font-bold">{currentTrial.maxValue.toFixed(2)}</span>
                                        <br />
                                        Sample Mean: <span>{currentTrial.sampleMean.toFixed(2)}</span>
                                    </p>
                                </div>

                                {trials.length > 0 && (
                                    <div>
                                        <h4 className="font-medium">Recent Trials</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {trials.map((trial) => (
                                                <button
                                                    key={trial.id}
                                                    onClick={() => setSelectedTrialId(trial.id)}
                                                    className={`p-2 text-left rounded shadow-sm transition-colors ${trial.id === selectedTrialId
                                                        ? 'bg-blue-100 border-2 border-blue-500'
                                                        : 'bg-white hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="font-mono text-xs truncate">ID: {trial.id}</div>
                                                    <div>Max: {trial.maxValue.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Mean: {trial.sampleMean.toFixed(2)}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-sm text-gray-600 mt-2">
                                <p>Understanding the Results:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Each trial is independent and reproducible using its unique ID</li>
                                    <li>Click on any previous trial to explore its distribution</li>
                                    <li>The purple bars show the expected distribution of values</li>
                                    <li>Green bars show actual samples from the selected trial</li>
                                    <li>Reference lines indicate standard deviation boundaries</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BenchmarkTrials;