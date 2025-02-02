
interface Bucket {
    start: number;
    end: number;
    expected: number;
    observed: number;
    value: number;
}
interface TargetVersion {
    id: string;
    trials: Trial[];
    name: string;
    timestamp: number;
}

interface Trial {
    id: string;
    targetVersionId: string;
    buckets: Bucket[];
    maxValue: number;
    timestamp: number;
    sampleMean: number;
}

export type {
    Bucket,
    TargetVersion,
    Trial,
}