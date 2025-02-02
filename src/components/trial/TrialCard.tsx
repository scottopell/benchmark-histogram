import { Trial } from "../../types";

interface TrialCardProps {
    trial: Trial;
    isSelected: boolean;
    onClick: () => void;
    trialIndex: number;
}

const TrialCard: React.FC<TrialCardProps> = ({
    trial,
    isSelected,
    onClick,
    trialIndex,
}) => {
    return (
        <button
            data-trial-id={trial.id}
            onClick={onClick}
            className={`flex-shrink-0 w-64 p-3 rounded-lg shadow-sm transition-all origin-center hover:scale-105 ${isSelected
                ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
                : 'bg-white border border-gray-200 hover:border-blue-300'
                }`}
        >
            <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium text-gray-900">
                    Trial #{trialIndex}
                </div>
                <div className="text-xs text-gray-500">
                    {trial.id}
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Max:</span>
                    <span className="text-sm font-semibold">{trial.maxValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Mean:</span>
                    <span className="text-sm">{trial.sampleMean.toFixed(2)}</span>
                </div>
            </div>

            {/* ... card content */}
        </button>
    );
};
export default TrialCard;