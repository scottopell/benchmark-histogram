// initialState.ts
import { TargetVersion, Trial, Experiment, ExperimentRun } from "@/types";
import { generateVersionId } from "../lib/versionId";
import { SeededRandom } from "./random";
import { generateTrial } from "./trialGeneration";

interface InitialState {
    versions: TargetVersion[];
    experiments: Experiment[];
    runs: ExperimentRun[];
}

// Define experiment types
const EXPERIMENTS = [
    {
        id: 'idle',
        name: 'Idle Workload',
        description: 'System at rest with minimal background processes',
        parameters: {
            cpuThreads: 1,
            memoryPressure: 0.1,
            ioRate: 0.1,
            networkTraffic: 0.1
        },
        color: '#60A5FA' // blue-400
    },
    {
        id: 'medium',
        name: 'Medium Workload',
        description: 'Typical production load with moderate resource usage',
        parameters: {
            cpuThreads: 4,
            memoryPressure: 0.5,
            ioRate: 0.5,
            networkTraffic: 0.5
        },
        color: '#34D399' // emerald-400
    },
    {
        id: 'heavy',
        name: 'Heavy Workload',
        description: 'High stress testing with intensive resource usage',
        parameters: {
            cpuThreads: 8,
            memoryPressure: 0.9,
            ioRate: 0.8,
            networkTraffic: 0.7
        },
        color: '#F87171' // red-400
    }
];

export function generateInitialState(seed: number = 12345): InitialState {
    const random = new SeededRandom(seed);
    const baseTimestamp = 1707350400000; // February 8, 2024 00:00:00 UTC

    const versionCount = 3; // Create 3 versions
    const trialsPerRun = 4;

    const versions: TargetVersion[] = [];
    const runs: ExperimentRun[] = [];

    // Make a copy of the experiments to avoid modifying the original
    const experiments: Experiment[] = JSON.parse(JSON.stringify(EXPERIMENTS));

    // Base configuration that matches the default app settings
    const baseConfig = {
        mean: 100,
        stdDev: 10,
        tailShift: 3,
        tailProbability: 0.01,
        samplesPerTrial: 20,
    };

    // First, create versions
    for (let i = 0; i < versionCount; i++) {
        const versionId = generateVersionId();
        versions.push({
            id: versionId,
            name: `Version ${i + 1}`,
            timestamp: baseTimestamp + (i * 86400000), // 1 day apart
        });
    }

    // Then create runs for each version-experiment combination
    for (let versionIndex = 0; versionIndex < versions.length; versionIndex++) {
        const version = versions[versionIndex];

        // Not all versions have all experiments
        // Version 1: All experiments
        // Version 2: Only 'idle' and 'medium'
        // Version 3: Only 'medium' and 'heavy'
        let availableExperiments: Experiment[];

        if (versionIndex === 0) {
            availableExperiments = experiments;
        } else if (versionIndex === 1) {
            availableExperiments = experiments.filter(e => e.id === 'idle' || e.id === 'medium');
        } else {
            availableExperiments = experiments.filter(e => e.id === 'medium' || e.id === 'heavy');
        }

        for (const experiment of availableExperiments) {
            const runId = `run-${version.id}-${experiment.id}`;
            const trials: Trial[] = [];

            // Adjust parameters based on the experiment type
            const experimentConfig = {
                ...baseConfig,
                // Idle: minimal variance, Heavy: high variance
                stdDev: baseConfig.stdDev * (0.8 + (experiment.parameters.memoryPressure || 0) * 0.5),
                // Higher CPU threads -> slightly higher mean
                mean: baseConfig.mean + ((experiment.parameters.cpuThreads || 1) - 1) * 2,
                // More I/O operations -> higher tailProbability
                tailProbability: baseConfig.tailProbability * (1 + (experiment.parameters.ioRate || 0)),
            };

            // Slightly vary parameters for each version
            const versionConfig = {
                ...experimentConfig,
                mean: experimentConfig.mean + random.range(-2, 2),
                stdDev: experimentConfig.stdDev + random.range(-1, 1),
            };

            // Generate trials for this run
            for (let j = 0; j < trialsPerRun; j++) {
                // Generate timestamp (runs are spaced by version and experiment, trials 1s apart)
                const timestamp = baseTimestamp +
                    (versionIndex * 86400000) +
                    (experiments.indexOf(experiment) * 3600000) +
                    (j * 1000);

                // Create the trial
                const trial: Trial = {
                    id: `trial-${runId}-${j}`,
                    runId: runId,
                    buckets: [],
                    maxValue: 0,
                    timestamp: timestamp,
                    sampleMean: 0
                };

                // Generate the actual trial data
                const runTrial = generateTrial(versionConfig, version.id, {
                    timestamp
                });

                // Copy the generated data to our trial
                trial.buckets = runTrial.buckets;
                trial.maxValue = runTrial.maxValue;
                trial.sampleMean = runTrial.sampleMean;

                // Verify the trial has valid buckets
                if (!trial.buckets || trial.buckets.length === 0) {
                    console.error('Generated initial trial missing buckets:', trial);
                }

                trials.push(trial);
            }

            // Create the run
            runs.push({
                id: runId,
                versionId: version.id,
                experimentId: experiment.id,
                trials: trials,
                timestamp: baseTimestamp + (versionIndex * 86400000) + (experiments.indexOf(experiment) * 3600000)
            });
        }
    }

    return { versions, experiments, runs };
}