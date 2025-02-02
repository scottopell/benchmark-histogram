interface TrialControlsProps {
    onRunTrial: () => void;
    onReset: () => void;
    isRunning: boolean;
    samplesPerTrial: number;
    onSamplesChange: (samples: number) => void;
    stdDev: number;
    onStdDevChange: (stdDev: number) => void;
}

const TrialControls: React.FC<TrialControlsProps> = ({
    onRunTrial,
    onReset,
    isRunning,
    samplesPerTrial,
    onSamplesChange,
    stdDev,
    onStdDevChange,
}) => {
    return (
        <div className="flex justify-between items-center">
            <div className="space-x-4">
                <button
                    onClick={onRunTrial}
                    disabled={isRunning}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isRunning ? 'Running Trial...' : 'Run New Trial'}
                </button>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                    Reset All Trials
                </button>
            </div>
            <div className="flex items-center space-x-4">
                <div className="w-48">
                    <label className="block text-sm font-medium mb-1" htmlFor="samplesPerTrial">
                        Samples: {samplesPerTrial}
                    </label>
                    <input
                        id="samplesPerTrial"
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={samplesPerTrial}
                        onChange={(e) => onSamplesChange(Number(e.target.value))}
                        className="w-full"
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
                        onChange={(e) => onStdDevChange(Number(e.target.value))}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    );
};
