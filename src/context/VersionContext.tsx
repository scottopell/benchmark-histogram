// VersionContext.tsx
import React, { createContext, useReducer, useContext, ReactNode, useCallback } from 'react';
import { generateVersionId } from "../lib/versionId";
import { TargetVersion, Trial, Experiment, ExperimentRun } from "@/types";

// Action types are defined through the union type below

// Define each action with its specific payload structure
interface InitializeAction {
  type: 'INITIALIZE';
  payload: {
    versions: TargetVersion[];
    experiments: Experiment[];
    runs: ExperimentRun[];
  };
}

interface SetCurrentVersionAction {
  type: 'SET_CURRENT_VERSION';
  payload: string; // versionId
}

interface SetCurrentExperimentAction {
  type: 'SET_CURRENT_EXPERIMENT';
  payload: string; // experimentId
}

interface AddVersionAction {
  type: 'ADD_VERSION';
  payload: Partial<TargetVersion>;
}

interface AddExperimentAction {
  type: 'ADD_EXPERIMENT';
  payload: Partial<Experiment>;
}

interface AddRunAction {
  type: 'ADD_RUN';
  payload: Partial<ExperimentRun>;
}

interface AddTrialAction {
  type: 'ADD_TRIAL';
  payload: {
    runId: string;
    trial: Trial;
  };
}

interface ResetAppAction {
  type: 'RESET_APP';
  payload: {
    versions: TargetVersion[];
    experiments: Experiment[];
    runs: ExperimentRun[];
  };
}

// Union type of all possible actions
type Action =
  | InitializeAction
  | SetCurrentVersionAction
  | SetCurrentExperimentAction
  | AddVersionAction
  | AddExperimentAction
  | AddRunAction
  | AddTrialAction
  | ResetAppAction;

// Application state structure
interface State {
  versions: TargetVersion[];
  experiments: Experiment[];
  runs: ExperimentRun[];
  currentVersionId: string | null;
  currentExperimentId: string | null;
  // Computed values that are derived from the state
  // These are stored for quick access but are always computed from the base state
  derivedState: {
    currentVersion: TargetVersion | null;
    currentExperiment: Experiment | null;
    currentRun: ExperimentRun | null;
    versionMap: Map<string, TargetVersion>;
    experimentMap: Map<string, Experiment>;
    runMap: Map<string, ExperimentRun>;
    versionRuns: Map<string, ExperimentRun[]>;
    experimentRuns: Map<string, ExperimentRun[]>;
    versionExperiments: Map<string, string[]>;
    runTrials: Map<string, Trial[]>;
  };
}

// Functions exposed by the context
interface VersionContextType {
  // State accessors
  versions: TargetVersion[];
  experiments: Experiment[];
  runs: ExperimentRun[];
  currentVersion: TargetVersion | null;
  currentExperiment: Experiment | null;
  currentRun: ExperimentRun | null;

  // Actions
  initialize: (data: { versions: TargetVersion[], experiments: Experiment[], runs: ExperimentRun[] }) => void;
  setCurrentVersion: (versionId: string) => void;
  setCurrentExperiment: (experimentId: string) => void;
  addVersion: (versionData: Partial<TargetVersion>) => void;
  addExperiment: (experimentData: Partial<Experiment>) => void;
  addRun: (runData: Partial<ExperimentRun>) => void;
  addTrial: (runId: string, trial: Trial) => void;
  resetApp: (data: { versions: TargetVersion[], experiments: Experiment[], runs: ExperimentRun[] }) => void;

  // Selectors
  getVersion: (versionId: string) => TargetVersion | null;
  getExperiment: (experimentId: string) => Experiment | null;
  getRun: (runId: string) => ExperimentRun | null;
  getRunsByVersion: (versionId: string) => ExperimentRun[];
  getRunsByExperiment: (experimentId: string) => ExperimentRun[];
  getExperimentsByVersion: (versionId: string) => string[]; // experiment IDs
  getCurrentRun: () => ExperimentRun | null;
  getTrialsByRun: (runId: string) => Trial[];
  getCurrentTrials: () => Trial[];
  getTrialById: (trialId: string) => Trial | null;
}

// Helper to compute derived state from base state
const computeDerivedState = (
  versions: TargetVersion[],
  experiments: Experiment[],
  runs: ExperimentRun[],
  currentVersionId: string | null,
  currentExperimentId: string | null
) => {
  // Build maps for O(1) lookups
  const versionMap = new Map<string, TargetVersion>();
  const experimentMap = new Map<string, Experiment>();
  const runMap = new Map<string, ExperimentRun>();
  const versionRuns = new Map<string, ExperimentRun[]>();
  const experimentRuns = new Map<string, ExperimentRun[]>();
  const versionExperiments = new Map<string, string[]>();
  const runTrials = new Map<string, Trial[]>();

  // Initialize collections
  versions.forEach(version => {
    versionMap.set(version.id, version);
    versionRuns.set(version.id, []);
    versionExperiments.set(version.id, []);
  });

  experiments.forEach(experiment => {
    experimentMap.set(experiment.id, experiment);
    experimentRuns.set(experiment.id, []);
  });

  runs.forEach(run => {
    runMap.set(run.id, run);
    runTrials.set(run.id, run.trials);

    // Add to version runs
    if (versionRuns.has(run.versionId)) {
      versionRuns.get(run.versionId)?.push(run);
    }

    // Add to experiment runs
    if (experimentRuns.has(run.experimentId)) {
      experimentRuns.get(run.experimentId)?.push(run);
    }

    // Add experiment to version's experiments if not already there
    if (versionExperiments.has(run.versionId)) {
      const exps = versionExperiments.get(run.versionId) || [];
      if (!exps.includes(run.experimentId)) {
        exps.push(run.experimentId);
        versionExperiments.set(run.versionId, exps);
      }
    }
  });

  // Get current version and experiment
  const currentVersion = currentVersionId ? versionMap.get(currentVersionId) || null : null;
  const currentExperiment = currentExperimentId ? experimentMap.get(currentExperimentId) || null : null;

  // Find current run based on version and experiment
  let currentRun: ExperimentRun | null = null;
  if (currentVersion && currentExperiment) {
    const versionExperimentRuns = runs.filter(
      run => run.versionId === currentVersionId && run.experimentId === currentExperimentId
    );
    // Get the most recent run if multiple exist
    if (versionExperimentRuns.length > 0) {
      currentRun = versionExperimentRuns.reduce(
        (latest, run) => run.timestamp > latest.timestamp ? run : latest,
        versionExperimentRuns[0]
      );
    }
  }

  return {
    currentVersion,
    currentExperiment,
    currentRun,
    versionMap,
    experimentMap,
    runMap,
    versionRuns,
    experimentRuns,
    versionExperiments,
    runTrials
  };
};

// Create reducer function with strong typing
function versionReducer(state: State, action: Action): State {
  console.log('🔄 Reducer action:', action.type, action.payload);

  switch (action.type) {
    case 'INITIALIZE': {
      const { versions, experiments, runs } = action.payload;
      const currentVersionId = versions.length > 0 ? versions[0].id : null;

      // Get default experiment for the selected version if one exists
      let currentExperimentId = null;
      if (currentVersionId) {
        // Find experiments associated with this version
        const versionExps = computeDerivedState(versions, experiments, runs, currentVersionId, null)
          .versionExperiments.get(currentVersionId) || [];

        // If there are experiments, select the first one
        if (versionExps.length > 0) {
          currentExperimentId = versionExps[0];
        } else {
          // Find the 'idle' experiment if it exists
          const idleExperiment = experiments.find(e => e.name.toLowerCase() === 'idle');
          if (idleExperiment) {
            currentExperimentId = idleExperiment.id;
          }
        }
      }

      const newState = {
        versions,
        experiments,
        runs,
        currentVersionId,
        currentExperimentId,
        derivedState: computeDerivedState(versions, experiments, runs, currentVersionId, currentExperimentId)
      };

      console.log('📊 State after INITIALIZE:', {
        versionsCount: newState.versions.length,
        experimentsCount: newState.experiments.length,
        runsCount: newState.runs.length,
        currentVersionId: newState.currentVersionId,
        currentExperimentId: newState.currentExperimentId
      });

      return newState;
    }

    case 'SET_CURRENT_VERSION': {
      const versionId = action.payload;

      // Verify the version exists before setting it as current
      if (!state.derivedState.versionMap.has(versionId)) {
        console.error('❌ Version not found:', versionId);
        return state;
      }

      // Find a default experiment for the selected version
      let currentExperimentId = null;

      // First check if there are any experiments already associated with this version
      const versionExps = state.derivedState.versionExperiments.get(versionId) || [];

      if (versionExps.length > 0) {
        // If there are experiments for this version, select the first one
        currentExperimentId = versionExps[0];
      } else {
        // Find the 'idle' experiment if it exists
        const idleExperiment = state.experiments.find(e => e.name.toLowerCase() === 'idle');
        if (idleExperiment) {
          currentExperimentId = idleExperiment.id;
        }
      }

      const newState = {
        ...state,
        currentVersionId: versionId,
        currentExperimentId,
        derivedState: computeDerivedState(
          state.versions,
          state.experiments,
          state.runs,
          versionId,
          currentExperimentId
        )
      };

      console.log('📊 State after SET_CURRENT_VERSION:', {
        currentVersionId: newState.currentVersionId,
        currentExperimentId: newState.currentExperimentId,
        availableExperiments: newState.derivedState.versionExperiments.get(versionId)?.length || 0
      });

      return newState;
    }

    case 'SET_CURRENT_EXPERIMENT': {
      const experimentId = action.payload;

      // Verify experiment exists
      if (!state.derivedState.experimentMap.has(experimentId)) {
        console.error('❌ Experiment not found:', experimentId);
        return state;
      }

      // Since we removed the ability to set null, we always check for a valid experiment
      const newState = {
        ...state,
        currentExperimentId: experimentId,
        derivedState: computeDerivedState(
          state.versions,
          state.experiments,
          state.runs,
          state.currentVersionId,
          experimentId
        )
      };

      console.log('📊 State after SET_CURRENT_EXPERIMENT:', {
        currentVersionId: newState.currentVersionId,
        currentExperimentId: newState.currentExperimentId,
        currentRun: newState.derivedState.currentRun?.id
      });

      return newState;
    }

    case 'ADD_VERSION': {
      const versionData = action.payload;

      // Create a new version with defaults and provided data
      const newVersion: TargetVersion = {
        id: versionData.id || generateVersionId(),
        name: versionData.name || `Version ${state.versions.length + 1}`,
        timestamp: versionData.timestamp || Date.now(),
      };

      // Create a new versions array
      const newVersions = [...state.versions, newVersion];

      // Find a default experiment
      let currentExperimentId = null;
      // Try to find the idle experiment
      const idleExperiment = state.experiments.find(e => e.name.toLowerCase() === 'idle');
      if (idleExperiment) {
        currentExperimentId = idleExperiment.id;
      } else if (state.experiments.length > 0) {
        // Otherwise use the first experiment
        currentExperimentId = state.experiments[0].id;
      }

      const newState = {
        ...state,
        versions: newVersions,
        currentVersionId: newVersion.id,
        currentExperimentId,
        derivedState: computeDerivedState(
          newVersions,
          state.experiments,
          state.runs,
          newVersion.id,
          currentExperimentId
        )
      };

      console.log('📊 State after ADD_VERSION:', {
        newVersionId: newVersion.id,
        versionsCount: newState.versions.length
      });

      return newState;
    }

    case 'ADD_EXPERIMENT': {
      const experimentData = action.payload;

      // Create a new experiment with defaults and provided data
      const newExperiment: Experiment = {
        id: experimentData.id || `exp-${Date.now()}`,
        name: experimentData.name || `Experiment ${state.experiments.length + 1}`,
        description: experimentData.description || '',
        parameters: experimentData.parameters || {},
        color: experimentData.color || '#808080',
      };

      // Create a new experiments array
      const newExperiments = [...state.experiments, newExperiment];

      const newState = {
        ...state,
        experiments: newExperiments,
        derivedState: computeDerivedState(
          state.versions,
          newExperiments,
          state.runs,
          state.currentVersionId,
          state.currentExperimentId
        )
      };

      console.log('📊 State after ADD_EXPERIMENT:', {
        newExperimentId: newExperiment.id,
        experimentsCount: newState.experiments.length
      });

      return newState;
    }

    case 'ADD_RUN': {
      const runData = action.payload;

      // Ensure version and experiment exist
      if (!runData.versionId || !state.derivedState.versionMap.has(runData.versionId)) {
        console.error('❌ Cannot add run, invalid version ID:', runData.versionId);
        return state;
      }

      if (!runData.experimentId || !state.derivedState.experimentMap.has(runData.experimentId)) {
        console.error('❌ Cannot add run, invalid experiment ID:', runData.experimentId);
        return state;
      }

      // Create a new run with defaults and provided data
      const newRun: ExperimentRun = {
        id: runData.id || `run-${Date.now()}`,
        versionId: runData.versionId,
        experimentId: runData.experimentId,
        trials: runData.trials || [],
        timestamp: runData.timestamp || Date.now(),
      };

      // Create a new runs array
      const newRuns = [...state.runs, newRun];

      const newState = {
        ...state,
        runs: newRuns,
        derivedState: computeDerivedState(
          state.versions,
          state.experiments,
          newRuns,
          state.currentVersionId,
          state.currentExperimentId
        )
      };

      console.log('📊 State after ADD_RUN:', {
        newRunId: newRun.id,
        versionId: newRun.versionId,
        experimentId: newRun.experimentId,
        runsCount: newState.runs.length
      });

      return newState;
    }

    case 'ADD_TRIAL': {
      const { runId, trial } = action.payload;

      // Find the run to add the trial to
      const runIndex = state.runs.findIndex(r => r.id === runId);
      if (runIndex === -1) {
        console.error('❌ Cannot add trial, run not found:', runId);
        return state;
      }

      // Create a new runs array with the updated run
      const newRuns = state.runs.map((run, index) => {
        if (index === runIndex) {
          // Deep clone the run and add the trial
          return {
            ...run,
            trials: [...run.trials, trial],
            timestamp: Date.now()
          };
        }
        return run;
      });

      // Compute new derived state
      const newState = {
        ...state,
        runs: newRuns,
        derivedState: computeDerivedState(
          state.versions,
          state.experiments,
          newRuns,
          state.currentVersionId,
          state.currentExperimentId
        )
      };

      // Log the details of what was added
      const updatedRun = newState.runs[runIndex];
      console.log('✅ Trial added:', {
        trialId: trial.id,
        toRunId: runId,
        newTrialCount: updatedRun.trials.length,
        isCurrentRun: state.derivedState.currentRun?.id === runId
      });

      return newState;
    }

    case 'RESET_APP': {
      const { versions, experiments, runs } = action.payload;
      const currentVersionId = versions.length > 0 ? versions[0].id : null;

      // Find a default experiment
      let currentExperimentId = null;
      if (currentVersionId) {
        // Check for experiments associated with this version
        const versionExps = computeDerivedState(versions, experiments, runs, currentVersionId, null)
          .versionExperiments.get(currentVersionId) || [];

        if (versionExps.length > 0) {
          currentExperimentId = versionExps[0];
        } else {
          // Find the 'idle' experiment if it exists
          const idleExperiment = experiments.find(e => e.name.toLowerCase() === 'idle');
          if (idleExperiment) {
            currentExperimentId = idleExperiment.id;
          } else if (experiments.length > 0) {
            // Otherwise use the first experiment
            currentExperimentId = experiments[0].id;
          }
        }
      }

      const newState = {
        versions,
        experiments,
        runs,
        currentVersionId,
        currentExperimentId,
        derivedState: computeDerivedState(versions, experiments, runs, currentVersionId, currentExperimentId)
      };

      console.log('🔄 App reset with', versions.length, 'versions,',
        experiments.length, 'experiments, and', runs.length, 'runs');

      return newState;
    }

    default:
      console.warn('❓ Unknown action type:', (action as any).type);
      return state;
  }
}

// Create context with null as initial value
const VersionContext = createContext<VersionContextType | null>(null);

// Custom hook to use the context
export const useVersionContext = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('❌ useVersionContext must be used within a VersionProvider');
  }
  return context;
};

// Provider component
export const VersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state with empty values and compute initial derived state
  const [state, dispatch] = useReducer(versionReducer, {
    versions: [],
    experiments: [],
    runs: [],
    currentVersionId: null,
    currentExperimentId: null,
    derivedState: computeDerivedState([], [], [], null, null)
  });

  // Extract values from state for easier access
  const { versions, experiments, runs } = state;
  const {
    currentVersion,
    currentExperiment,
    currentRun,
    versionMap,
    experimentMap,
    runMap,
    versionRuns,
    experimentRuns,
    versionExperiments,
    runTrials
  } = state.derivedState;

  // Define action dispatchers
  const initialize = useCallback((data: { versions: TargetVersion[], experiments: Experiment[], runs: ExperimentRun[] }) => {
    console.log('🚀 Initializing app with', data.versions.length, 'versions,',
      data.experiments.length, 'experiments, and', data.runs.length, 'runs');
    dispatch({
      type: 'INITIALIZE',
      payload: data
    });
  }, []);

  const setCurrentVersion = useCallback((versionId: string) => {
    console.log('👉 Setting current version:', versionId);
    dispatch({
      type: 'SET_CURRENT_VERSION',
      payload: versionId
    });
  }, []);

  const setCurrentExperiment = useCallback((experimentId: string) => {
    console.log('👉 Setting current experiment:', experimentId);
    dispatch({
      type: 'SET_CURRENT_EXPERIMENT',
      payload: experimentId
    });
  }, []);

  const addVersion = useCallback((versionData: Partial<TargetVersion>) => {
    console.log('➕ Adding new version');
    dispatch({
      type: 'ADD_VERSION',
      payload: versionData
    });
  }, []);

  const addExperiment = useCallback((experimentData: Partial<Experiment>) => {
    console.log('➕ Adding new experiment');
    dispatch({
      type: 'ADD_EXPERIMENT',
      payload: experimentData
    });
  }, []);

  const addRun = useCallback((runData: Partial<ExperimentRun>) => {
    console.log('➕ Adding new run for version:', runData.versionId, 'experiment:', runData.experimentId);
    dispatch({
      type: 'ADD_RUN',
      payload: runData
    });
  }, []);

  const addTrial = useCallback((runId: string, trial: Trial) => {
    console.log('➕ Adding trial to run:', runId, 'trial:', trial.id);
    dispatch({
      type: 'ADD_TRIAL',
      payload: { runId, trial }
    });
  }, []);

  const resetApp = useCallback((data: { versions: TargetVersion[], experiments: Experiment[], runs: ExperimentRun[] }) => {
    console.log('🔄 Resetting app');
    dispatch({
      type: 'RESET_APP',
      payload: data
    });
  }, []);

  // Define selectors
  const getVersion = useCallback((versionId: string): TargetVersion | null => {
    return versionMap.get(versionId) || null;
  }, [versionMap]);

  const getExperiment = useCallback((experimentId: string): Experiment | null => {
    return experimentMap.get(experimentId) || null;
  }, [experimentMap]);

  const getRun = useCallback((runId: string): ExperimentRun | null => {
    return runMap.get(runId) || null;
  }, [runMap]);

  const getRunsByVersion = useCallback((versionId: string): ExperimentRun[] => {
    return versionRuns.get(versionId) || [];
  }, [versionRuns]);

  const getRunsByExperiment = useCallback((experimentId: string): ExperimentRun[] => {
    return experimentRuns.get(experimentId) || [];
  }, [experimentRuns]);

  const getExperimentsByVersion = useCallback((versionId: string): string[] => {
    return versionExperiments.get(versionId) || [];
  }, [versionExperiments]);

  const getCurrentRun = useCallback((): ExperimentRun | null => {
    return currentRun;
  }, [currentRun]);

  const getTrialsByRun = useCallback((runId: string): Trial[] => {
    return runTrials.get(runId) || [];
  }, [runTrials]);

  const getCurrentTrials = useCallback((): Trial[] => {
    return currentRun ? currentRun.trials : [];
  }, [currentRun]);

  const getTrialById = useCallback((trialId: string): Trial | null => {
    // Search through all runs for the trial
    for (const trials of runTrials.values()) {
      const found = trials.find(t => t.id === trialId);
      if (found) return found;
    }
    return null;
  }, [runTrials]);

  // Prepare context value
  const contextValue: VersionContextType = {
    // State
    versions,
    experiments,
    runs,
    currentVersion,
    currentExperiment,
    currentRun,

    // Action dispatchers
    initialize,
    setCurrentVersion,
    setCurrentExperiment,
    addVersion,
    addExperiment,
    addRun,
    addTrial,
    resetApp,

    // Selectors
    getVersion,
    getExperiment,
    getRun,
    getRunsByVersion,
    getRunsByExperiment,
    getExperimentsByVersion,
    getCurrentRun,
    getTrialsByRun,
    getCurrentTrials,
    getTrialById
  };

  return (
    <VersionContext.Provider value={contextValue}>
      {children}
    </VersionContext.Provider>
  );
};