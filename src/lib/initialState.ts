// initialState.ts
import { TargetVersion, Trial } from "@/types";
import { generateVersionId } from "../lib/versionId";
import { SeededRandom } from "./random";
import { generateTrial } from "./trialGeneration";

export function generateInitialState(seed: number = 12345): TargetVersion[] {
    const random = new SeededRandom(seed);
    const baseTimestamp = 1707350400000; // February 8, 2024 00:00:00 UTC

    const versionCount = 5;
    const trialsPerVersion = 4;
    const versions: TargetVersion[] = [];

    // Base configuration that matches the default app settings
    const baseConfig = {
        mean: 100,
        stdDev: 10,
        tailShift: 3,
        tailProbability: 0.01,
        samplesPerTrial: 20,
    };

    for (let i = 0; i < versionCount; i++) {
        const versionId = generateVersionId();
        const trials: Trial[] = [];

        // Slightly vary parameters for each version to simulate different conditions
        const versionConfig = {
            ...baseConfig,
            mean: baseConfig.mean + random.range(-5, 5),
            stdDev: baseConfig.stdDev + random.range(-2, 2),
        };

        // Generate trials for this version
        for (let j = 0; j < trialsPerVersion; j++) {
            const trialId = `trial-${random.rangeInt(10000, 99999)}`;
            const timestamp = baseTimestamp + (i * 3600000) + (j * 1000); // Space versions 1h apart, trials 1s apart

            const trial = generateTrial(versionConfig, versionId, {
                id: trialId,
                timestamp
            });

            trials.push(trial);
        }

        versions.push({
            id: versionId,
            name: i === 2 ? `v1.0.${random.rangeInt(1, 9)}` : `Version ${i + 1}`,
            trials,
            timestamp: baseTimestamp + (i * 3600000)
        });
    }

    return versions;
}