// trialGeneration.ts
import * as id from "../lib/id";
import { Bucket, Trial } from '@/types';
import { generateSeedFromId, xorshift } from '@/lib/random';
import { useCallback } from "react";

interface TrialGenerationConfig {
    mean: number;
    stdDev: number;
    tailShift: number;
    tailProbability: number;
    samplesPerTrial: number;
}

const erf = (x: number): number => {
    const sign = Math.sign(x);
    x = Math.abs(x);
    const t = 1.0 / (1.0 + 0.3275911 * x);
    const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
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

export function generateTrial(
    config: TrialGenerationConfig,
    targetVersionId: string,
    overrides: Partial<Trial> = {}
): Trial {
    const { mean, stdDev, tailShift, tailProbability, samplesPerTrial } = config;
    const trialId = overrides.id || id.generateId();

    const { domain, buckets, bucketSize } = calculateBucketsAndDomain(
        mean,
        stdDev,
        tailShift,
        tailProbability,
        samplesPerTrial
    );

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

    return {
        id: trialId,
        targetVersionId,
        buckets: newBuckets,
        maxValue,
        timestamp: overrides.timestamp || Date.now(),
        sampleMean,
        ...overrides
    };
}

// Hook for use in React components
export const useTrialGeneration = (config: TrialGenerationConfig) => {
    const generateTrialWithConfig = useCallback(
        (targetVersionId: string) => generateTrial(config, targetVersionId),
        [config]
    );

    return { generateTrial: generateTrialWithConfig };
};