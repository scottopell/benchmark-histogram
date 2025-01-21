import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BenchmarkTrials = () => {
    const [mean] = useState(100);
    const [stdDev, setStdDev] = useState(10);
    const [tailProbability, setTailProbability] = useState(0.01);  // renamed from outlierProb
    const [tailShift, setTailShift] = useState(3);  // renamed from outlierMagnitude
    const [samplesPerTrial, setSamplesPerTrial] = useState(20);  // renamed from numReplicas
    const [showCumulative, setShowCumulative] = useState(false);

    const [trials, setTrials] = useState([]);  // Store multiple trials
    const [currentTrial, setCurrentTrial] = useState(null);
    const [maxObservedValue, setMaxObservedValue] = useState(null);
    const [isRunning, setIsRunning] = useState(false);


    const { domain, buckets, bucketSize, sigmaLines } = useMemo(() => {
        const minX = mean - 4 * stdDev;
        const maxX = mean + (tailShift + 2) * stdDev;
        const domain = [minX, maxX];
        const numBuckets = 30;
        const bucketSize = (maxX - minX) / numBuckets;

        // Calculate the expected distribution for each bucket
        const buckets = Array(numBuckets).fill(0).map((_, i) => {
            const start = minX + i * bucketSize;
            const end = minX + (i + 1) * bucketSize;
            const centerValue = (start + end) / 2;

            // Calculate the expected probability for the main distribution
            const mainProb = (1 - tailProbability) * (
                (erf((end - mean) / (Math.sqrt(2) * stdDev)) -
                    erf((start - mean) / (Math.sqrt(2) * stdDev))) / 2
            );

            // Calculate the expected probability for the tail distribution
            const tailProb = tailProbability * (
                (erf((end - (mean + tailShift * stdDev)) / (Math.sqrt(2) * stdDev)) -
                    erf((start - (mean + tailShift * stdDev)) / (Math.sqrt(2) * stdDev))) / 2
            );

            // Total probability for this bucket
            const totalProb = mainProb + tailProb;

            // Convert probability to expected count based on samplesPerTrial
            const expected = totalProb * samplesPerTrial;

            console.log(`Bucket ${i}: [${start.toFixed(2)}, ${end.toFixed(2)}] -> Expected: ${expected.toFixed(3)}`);

            return {
                start,
                end,
                expected,
                observed: 0,
                cumulative: 0,
                value: centerValue
            };
        });

        // Add error function if it doesn't exist
        function erf(x) {
            const sign = Math.sign(x);
            x = Math.abs(x);
            const t = 1.0 / (1.0 + 0.3275911 * x);
            const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
            return sign * y;
        }

        console.log('Domain:', domain);
        console.log('Total expected samples:', buckets.reduce((sum, b) => sum + b.expected, 0));

        const sigmaLines = [-3, -2, -1, 1, 2, 3].map(sigma => ({
            value: mean + sigma * stdDev,
            label: `${sigma}σ`
        }));

        return { domain, buckets, bucketSize, sigmaLines };
    }, [mean, stdDev, tailShift, tailProbability, samplesPerTrial]);  // Add dependencies

    // Calculate the probability of detecting a rare event given sample size and number of trials
    const calculateRareEventDetectionPower = (samplesPerTrial, numTrials) => {
        // Probability of NOT seeing a 1-in-100 event in one sample
        const probMiss = 0.99;
        // Probability of NOT seeing it in all samples across all trials
        const probMissAll = Math.pow(probMiss, samplesPerTrial * numTrials);
        // Therefore, probability of seeing it at least once
        const detectionPower = (1 - probMissAll) * 100;
        return detectionPower.toFixed(1);
    };

    // Generate a single sample
    const generateSample = () => {
        const u1 = Math.random();
        const u2 = Math.random();
        if (u1 < tailProbability) {
            const z = Math.sqrt(-2 * Math.log(u2)) * Math.cos(2 * Math.PI * Math.random());
            return mean + tailShift * stdDev + z * stdDev;
        } else {
            const z = Math.sqrt(-2 * Math.log(u2)) * Math.cos(2 * Math.PI * Math.random());
            return mean + z * stdDev;
        }
    };

    // Run a single trial
    const runTrial = () => {
        if (!buckets) return;
        setIsRunning(true);

        const newBuckets = buckets.map(bucket => ({ ...bucket, observed: 0 }));
        const samples = Array(samplesPerTrial).fill(0).map(generateSample);
        const maxValue = Math.max(...samples);
        const sampleMean = samples.reduce((a, b) => a + b, 0) / samples.length;

        let cumulativeCount = 0;
        samples.forEach(value => {
            const bucketIndex = Math.floor((value - domain[0]) / bucketSize);
            if (bucketIndex >= 0 && bucketIndex < newBuckets.length) {
                newBuckets[bucketIndex].observed++;
                cumulativeCount += 1;
                newBuckets[bucketIndex].cumulativeObserved = cumulativeCount;
            }
        });

        const trial = {
            buckets: newBuckets,
            maxValue,
            timestamp: Date.now(),
            sampleMean
        };

        setCurrentTrial(trial);
        setMaxObservedValue(maxValue);
        setTrials(prev => [...prev.slice(-4), trial]); // Keep last 5 trials

        setTimeout(() => setIsRunning(false), 500);
    };

    const reset = () => {
        setCurrentTrial(null);
        setMaxObservedValue(null);
        setTrials([]);
    };

    const chartData = useMemo(() => {
        const data = (currentTrial?.buckets || buckets).map(bucket => {
            const item = {
                value: (bucket.start + bucket.end) / 2,
                expected: bucket.expected || 0,
                observed: bucket.observed || 0,
                expectedCumulative: showCumulative ? bucket.cumulative : undefined,
                observedCumulative: showCumulative && bucket.cumulativeObserved ? bucket.cumulativeObserved : undefined,
                range: `${bucket.start.toFixed(1)} - ${bucket.end.toFixed(1)}`,
                sigma: ((bucket.value - mean) / stdDev).toFixed(2)
            };
            return item;
        });

        return data;
    }, [currentTrial, buckets, showCumulative, mean, stdDev]);

    // Log whenever buckets are updated
    useEffect(() => {
        console.log('Buckets updated:', buckets);
    }, [buckets]);

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
                                    value: showCumulative ? 'Cumulative Count' : 'Count',
                                    angle: -90,
                                    position: 'insideLeft',
                                    offset: 10
                                }}
                            />
                            <Tooltip
                                formatter={(value, name, entry) => {
                                    if (name === 'expected' || name === 'expectedCumulative') {
                                        return [value.toFixed(2), showCumulative ? 'Expected Cumulative' : 'Expected Distribution'];
                                    }
                                    return [value, showCumulative ? 'Observed Cumulative' : 'Observed Samples'];
                                }}
                                labelFormatter={(_, data) => {
                                    const item = data[0]?.payload;
                                    if (!item) return '';
                                    return `Range: ${item.range}\nStandard Deviations from Mean: ${item.sigma}σ`;
                                }}
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
                                    labelPosition="top"
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
                                        Maximum Value: <span className="font-bold">{currentTrial.maxValue.toFixed(2)}</span>
                                        <br />
                                        Sample Mean: <span>{currentTrial.sampleMean.toFixed(2)}</span>
                                        <br />
                                        Detection Power: {calculateRareEventDetectionPower(samplesPerTrial, trials.length)}% chance of seeing a 1-in-100 event
                                    </p>
                                </div>

                                {trials.length > 0 && (
                                    <div>
                                        <h4 className="font-medium">Recent Trial Results</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {trials.map((trial, i) => (
                                                <div key={trial.timestamp} className="p-2 bg-white rounded shadow-sm">
                                                    <div>Max: {trial.maxValue.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Mean: {trial.sampleMean.toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-sm text-gray-600 mt-2">
                                <p>Understanding the Results:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Each trial represents an independent set of {samplesPerTrial} samples</li>
                                    <li>The purple bars show the expected distribution of values</li>
                                    <li>Green bars show actual samples from the current trial</li>
                                    <li>Larger sample sizes increase the chance of detecting rare performance events</li>
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