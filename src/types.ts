
interface Bucket {
    start: number;
    end: number;
    expected: number;
    observed: number;
    value: number;
}

interface Experiment {
    id: string;
    name: string;           // e.g., "idle", "medium-workload"
    description: string;    // Detailed description of the workload
    parameters: {           // Specific workload configuration
        cpuThreads?: number;
        memoryPressure?: number;
        ioRate?: number;
        networkTraffic?: number;
    };
    color: string;         // For visual identification in the UI
}

interface TargetVersion {
    id: string;
    name: string;
    timestamp: number;
}

interface ExperimentRun {
    id: string;
    versionId: string;     // Reference to the target version
    experimentId: string;  // Reference to the experiment definition
    trials: Trial[];
    timestamp: number;
}

interface Trial {
    id: string;
    runId: string;        // Reference to the experiment run
    buckets: Bucket[];
    maxValue: number;
    timestamp: number;
    sampleMean: number;
}

export type {
    Bucket,
    Experiment,
    TargetVersion,
    ExperimentRun,
    Trial,
}