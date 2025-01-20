import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BenchmarkHistogram = () => {
    const [mean] = useState(100);
    const [stdDev, setStdDev] = useState(10);
    const [outlierProb, setOutlierProb] = useState(0.01);
    const [outlierMagnitude, setOutlierMagnitude] = useState(3);
    const [numReplicas, setNumReplicas] = useState(20);
    const [showCumulative, setShowCumulative] = useState(false);

    const [currentRun, setCurrentRun] = useState(null);
    const [maxObserved, setMaxObserved] = useState(null);
    const [runHistory, setRunHistory] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);

    const { domain, buckets, bucketSize, sigmaLines } = useMemo(() => {
        const minX = mean - 4 * stdDev;
        const maxX = mean + (outlierMagnitude + 2) * stdDev;
        const numBuckets = 30;
        const bucketSize = (maxX - minX) / numBuckets;

        const buckets = Array(numBuckets).fill(0).map((_, i) => ({
            start: minX + i * bucketSize,
            end: minX + (i + 1) * bucketSize,
            expected: 0,
            observed: 0,
            cumulative: 0
        }));

        const sigmaLines = [-3, -2, -1, 1, 2, 3].map(sigma => ({
            value: mean + sigma * stdDev,
            label: `${sigma}σ`
        }));

        return {
            domain: [minX, maxX],
            buckets,
            bucketSize,
            sigmaLines
        };
    }, [mean, stdDev, outlierMagnitude]);

    useEffect(() => {
        if (!buckets) return;

        let cumulativeProb = 0;
        buckets.forEach(bucket => {
            const midpoint = (bucket.start + bucket.end) / 2;

            const zNormal = (midpoint - mean) / stdDev;
            const normalDensity = (1 - outlierProb) * Math.exp(-0.5 * zNormal * zNormal) / (stdDev * Math.sqrt(2 * Math.PI));

            const zOutlier = (midpoint - (mean + outlierMagnitude * stdDev)) / stdDev;
            const outlierDensity = outlierProb * Math.exp(-0.5 * zOutlier * zOutlier) / (stdDev * Math.sqrt(2 * Math.PI));

            const totalDensity = normalDensity + outlierDensity;
            bucket.expected = totalDensity * bucketSize * numReplicas;
            cumulativeProb += totalDensity * bucketSize;
            bucket.cumulative = cumulativeProb * numReplicas;
        });
    }, [mean, stdDev, outlierProb, outlierMagnitude, buckets, bucketSize, numReplicas]);

    const generateSample = () => {
        const u1 = Math.random();
        const u2 = Math.random();
        if (u1 < outlierProb) {
            const z = Math.sqrt(-2 * Math.log(u2)) * Math.cos(2 * Math.PI * Math.random());
            return mean + outlierMagnitude * stdDev + z * stdDev;
        } else {
            const z = Math.sqrt(-2 * Math.log(u2)) * Math.cos(2 * Math.PI * Math.random());
            return mean + z * stdDev;
        }
    };

    const runSimulation = () => {
        if (!buckets) return;
        setIsAnimating(true);

        const newBuckets = buckets.map(bucket => ({ ...bucket, observed: 0 }));
        const samples = Array(numReplicas).fill(0).map(generateSample);
        const max = Math.max(...samples);

        let cumulativeObserved = 0;
        samples.forEach(value => {
            const bucketIndex = Math.floor((value - domain[0]) / bucketSize);
            if (bucketIndex >= 0 && bucketIndex < newBuckets.length) {
                newBuckets[bucketIndex].observed++;
                cumulativeObserved += 1;
                newBuckets[bucketIndex].cumulativeObserved = cumulativeObserved;
            }
        });

        setCurrentRun(newBuckets);
        setMaxObserved(max);
        setRunHistory(prev => [...prev.slice(-9), { max, timestamp: Date.now() }]);

        setTimeout(() => setIsAnimating(false), 500);
    };

    const reset = () => {
        setCurrentRun(null);
        setMaxObserved(null);
        setRunHistory([]);
    };

    const chartData = (currentRun || buckets).map(bucket => ({
        value: (bucket.start + bucket.end) / 2,
        expected: parseFloat(bucket.expected.toFixed(2)),
        observed: bucket.observed || 0,
        expectedCumulative: showCumulative ? bucket.cumulative : undefined,
        observedCumulative: showCumulative && bucket.cumulativeObserved ? bucket.cumulativeObserved : undefined,
        label: `${bucket.start.toFixed(1)} - ${bucket.end.toFixed(1)}`,
        percentile: ((bucket.value - mean) / stdDev).toFixed(2)
    }));

    const yAxisDomain = [0, Math.max(
        Math.ceil(Math.max(...chartData.map(d => showCumulative ? d.expectedCumulative : d.expected))),
        currentRun ? Math.max(...chartData.map(d => showCumulative ? d.observedCumulative : d.observed)) : 0
    )];

    return (
        <div className="w-full p-6 bg-white rounded-lg shadow">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Benchmark Distribution Analysis</h2>
                <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={showCumulative}
                            onChange={(e) => setShowCumulative(e.target.checked)}
                            className="form-checkbox"
                        />
                        <span className="ml-2">Show Cumulative</span>
                    </label>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" htmlFor="replicas">
                            Number of Replicas: {numReplicas}
                        </label>
                        <input
                            id="replicas"
                            type="range"
                            min="5"
                            max="100"
                            step="5"
                            value={numReplicas}
                            onChange={(e) => setNumReplicas(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" htmlFor="outlierProb">
                            Outlier Probability: {(outlierProb * 100).toFixed(1)}%
                        </label>
                        <input
                            id="outlierProb"
                            type="range"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={outlierProb * 100}
                            onChange={(e) => setOutlierProb(Number(e.target.value) / 100)}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" htmlFor="outlierMag">
                            Outlier Magnitude: {outlierMagnitude}σ above mean
                        </label>
                        <input
                            id="outlierMag"
                            type="range"
                            min="1"
                            max="6"
                            step="0.5"
                            value={outlierMagnitude}
                            onChange={(e) => setOutlierMagnitude(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" htmlFor="stdDev">
                            Standard Deviation: {stdDev}
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
                        onClick={runSimulation}
                        disabled={isAnimating}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isAnimating ? 'Running...' : 'Run Simulation'}
                    </button>
                    <button
                        onClick={reset}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Reset
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
                                domain={yAxisDomain}
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
                                        return [value.toFixed(2), showCumulative ? 'Expected Cumulative' : 'Expected Count'];
                                    }
                                    return [value, showCumulative ? 'Observed Cumulative' : 'Observed Count'];
                                }}
                                labelFormatter={(_, data) => {
                                    const item = data[0]?.payload;
                                    if (!item) return '';
                                    return `Range: ${item.label}\nPercentile: ${item.percentile}σ`;
                                }}
                            />
                            <Legend
                                layout="horizontal"
                                verticalAlign="top"
                                align="center"
                                height={36}
                                formatter={(value) => {
                                    if (value === 'expected' || value === 'expectedCumulative') {
                                        return `Expected (n=${numReplicas})`;
                                    }
                                    return `Observed (n=${numReplicas})`;
                                }}
                            />

                            <Bar
                                dataKey={showCumulative ? "expectedCumulative" : "expected"}
                                fill="#8884d8"
                                opacity={0.3}
                                name="expected"
                                isAnimationActive={!isAnimating}
                            />

                            {currentRun && (
                                <Bar
                                    dataKey={showCumulative ? "observedCumulative" : "observed"}
                                    fill="#82ca9d"
                                    opacity={0.8}
                                    name="observed"
                                    isAnimationActive={!isAnimating}
                                />
                            )}

                            {sigmaLines.map(line => (
                                <ReferenceLine
                                    key={line.label}
                                    x={line.value}
                                    stroke="#666"
                                    strokeDasharray="3 3"
                                    label={{ value: line.label, position: "top" }}
                                />
                            ))}

                            {maxObserved && (
                                <ReferenceLine
                                    x={maxObserved}
                                    stroke="#ff4444"
                                    label={{ value: "Max", position: "top" }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Run Insights:</h3>
                    {maxObserved && (
                        <div className="space-y-2">
                            <p>
                                Current maximum: <span className="font-bold">{maxObserved.toFixed(2)}</span>
                                {maxObserved > mean + outlierMagnitude * stdDev * 0.9 &&
                                    " (Likely outlier detected!)"}
                            </p>
                            {runHistory.length > 0 && (
                                <div>
                                    <p className="font-semibold mb-1">Recent maximums:</p>
                                    <div className="grid grid-cols-5 gap-2 text-sm">
                                        {runHistory.slice(-5).map((run, i) => (
                                            <div key={run.timestamp} className={`p-1 rounded ${run.max > mean + outlierMagnitude * stdDev * 0.9 ? 'bg-red-100' : 'bg-gray-100'
                                                }`}>
                                                {run.max.toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-sm text-gray-600">
                                Expected outlier threshold: {(mean + outlierMagnitude * stdDev).toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BenchmarkHistogram;