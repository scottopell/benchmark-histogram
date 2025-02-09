import React from 'react';
import { ComposedChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ValueType, NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export interface ChartDataItem {
    value: number;
    expected: number;
    observed: number;
    range: string;
    sigma: string;
}

export interface MaxValuePoint {
    x: number;
    y: number;
    opacity: number;
    trialId: string;
}

export interface SigmaLine {
    value: number;
    label: string;
}

interface DistributionChartProps {
    chartData: ChartDataItem[];
    domain: [number, number];
    maxValuePoints: MaxValuePoint[];
    sigmaLines: SigmaLine[];
    selectedTrialId: string | null;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
    chartData,
    domain,
    maxValuePoints,
    sigmaLines,
    selectedTrialId,
}) => {
    const formatTooltip = (value: ValueType, name: NameType): [number | string, string] => {
        if (name === 'expected') {
            return [typeof value === 'number' ? value.toFixed(2) : '0', 'Expected Distribution'];
        }
        if (name === 'maxValues') {
            return [typeof value === 'number' ? value.toFixed(2) : '0', 'Trial Maximum'];
        }
        return [typeof value === 'number' ? value.toFixed(2) : '0', 'Observed Samples'];
    };

    const formatTooltipLabel = (_label: any, payload: Array<Payload<ValueType, NameType>>): React.ReactNode => {
        const item = payload[0]?.payload as ChartDataItem;
        if (!item) return '';
        return `Range: ${item.range}\nStandard Deviations from Mean: ${item.sigma}σ`;
    };

    return (
        <>
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

                            {selectedTrialId && (
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
        </>
    );
};

export const DistributionChartGuide: React.FC<{}> = ({ }) => {
    return (
        <Card className="mt-6" >
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
        </Card >
    )
};
