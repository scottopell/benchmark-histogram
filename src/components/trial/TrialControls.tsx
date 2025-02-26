interface TrialControlsProps {
    onRunTrial: () => void;
    isRunning: boolean;
}

const TrialControls: React.FC<TrialControlsProps> = ({
    onRunTrial,
    isRunning,
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
            </div>
        </div>
    );
};

export {
    TrialControls
}