// VersionContext.tsx
import React, { createContext, useReducer, useContext, ReactNode, useCallback } from 'react';
import { generateVersionId } from "../lib/versionId";
import { TargetVersion, Trial } from "@/types";

// Define action types with literal type for better type safety
type ActionType = 
  | 'INITIALIZE' 
  | 'SET_CURRENT_VERSION' 
  | 'ADD_VERSION' 
  | 'ADD_TRIAL'
  | 'RESET_APP';

// Define each action with its specific payload structure
interface InitializeAction {
  type: 'INITIALIZE';
  payload: TargetVersion[];
}

interface SetCurrentVersionAction {
  type: 'SET_CURRENT_VERSION';
  payload: string; // versionId
}

interface AddVersionAction {
  type: 'ADD_VERSION';
  payload: Partial<TargetVersion>;
}

interface AddTrialAction {
  type: 'ADD_TRIAL';
  payload: {
    versionId: string;
    trial: Trial;
  };
}

interface ResetAppAction {
  type: 'RESET_APP';
  payload: TargetVersion[];
}

// Union type of all possible actions
type Action = 
  | InitializeAction
  | SetCurrentVersionAction
  | AddVersionAction 
  | AddTrialAction
  | ResetAppAction;

// Application state structure
interface State {
  versions: TargetVersion[];
  currentVersionId: string | null;
  // Computed values that are derived from the state
  // These are stored for quick access but are always computed from the base state
  derivedState: {
    currentVersion: TargetVersion | null;
    versionMap: Map<string, TargetVersion>;
    versionTrials: Map<string, Trial[]>;
  };
}

// Functions exposed by the context
interface VersionContextType {
  // State accessors
  versions: TargetVersion[];
  currentVersion: TargetVersion | null;
  
  // Actions
  initialize: (versions: TargetVersion[]) => void;
  setCurrentVersion: (versionId: string) => void;
  addVersion: (versionData: Partial<TargetVersion>) => void;
  addTrial: (versionId: string, trial: Trial) => void;
  resetApp: (initialVersions: TargetVersion[]) => void;
  
  // Selectors
  getVersion: (versionId: string) => TargetVersion | null;
  getTrials: (versionId: string) => Trial[];
  getCurrentTrials: () => Trial[];
  getTrialById: (trialId: string) => Trial | null;
}

// Helper to compute derived state from base state
const computeDerivedState = (versions: TargetVersion[], currentVersionId: string | null) => {
  // Build maps for O(1) lookups
  const versionMap = new Map<string, TargetVersion>();
  const versionTrials = new Map<string, Trial[]>();
  
  versions.forEach(version => {
    versionMap.set(version.id, version);
    versionTrials.set(version.id, version.trials);
  });
  
  return {
    currentVersion: currentVersionId ? versionMap.get(currentVersionId) || null : null,
    versionMap,
    versionTrials
  };
};

// Create reducer function with strong typing
function versionReducer(state: State, action: Action): State {
  console.log('🔄 Reducer action:', action.type, action.payload);
  
  switch (action.type) {
    case 'INITIALIZE': {
      const versions = action.payload;
      const currentVersionId = versions.length > 0 ? versions[0].id : null;
      
      const newState = {
        versions,
        currentVersionId,
        derivedState: computeDerivedState(versions, currentVersionId)
      };
      
      console.log('📊 State after INITIALIZE:', {
        versionsCount: newState.versions.length,
        currentVersionId: newState.currentVersionId
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
      
      const newState = {
        ...state,
        currentVersionId: versionId,
        derivedState: computeDerivedState(state.versions, versionId)
      };
      
      console.log('📊 State after SET_CURRENT_VERSION:', {
        currentVersionId: newState.currentVersionId,
        trialsCount: newState.derivedState.currentVersion?.trials.length
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
        trials: versionData.trials || [],
      };
      
      // Create a new versions array
      const newVersions = [...state.versions, newVersion];
      
      // The new version becomes the current version
      const newState = {
        versions: newVersions,
        currentVersionId: newVersion.id,
        derivedState: computeDerivedState(newVersions, newVersion.id)
      };
      
      console.log('📊 State after ADD_VERSION:', {
        newVersionId: newVersion.id,
        versionsCount: newState.versions.length
      });
      
      return newState;
    }
    
    case 'ADD_TRIAL': {
      const { versionId, trial } = action.payload;
      
      // Find the version to add the trial to
      const versionIndex = state.versions.findIndex(v => v.id === versionId);
      if (versionIndex === -1) {
        console.error('❌ Cannot add trial, version not found:', versionId);
        return state;
      }
      
      // Create a new versions array with the updated version
      const newVersions = state.versions.map((version, index) => {
        if (index === versionIndex) {
          // Deep clone the version and add the trial
          return {
            ...version,
            trials: [...version.trials, trial],
            timestamp: Date.now()
          };
        }
        return version;
      });
      
      // Compute new derived state
      const newState = {
        versions: newVersions,
        currentVersionId: state.currentVersionId,
        derivedState: computeDerivedState(newVersions, state.currentVersionId)
      };
      
      // Log the details of what was added
      const updatedVersion = newState.versions[versionIndex];
      console.log('✅ Trial added:', {
        trialId: trial.id,
        toVersionId: versionId,
        newTrialCount: updatedVersion.trials.length,
        isCurrentVersion: versionId === state.currentVersionId
      });
      
      return newState;
    }
    
    case 'RESET_APP': {
      const initialVersions = action.payload;
      const currentVersionId = initialVersions.length > 0 ? initialVersions[0].id : null;
      
      const newState = {
        versions: initialVersions,
        currentVersionId,
        derivedState: computeDerivedState(initialVersions, currentVersionId)
      };
      
      console.log('🔄 App reset with', initialVersions.length, 'versions');
      
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
    currentVersionId: null,
    derivedState: computeDerivedState([], null)
  });
  
  // Extract values from state for easier access
  const { versions } = state;
  const { currentVersion, versionMap, versionTrials } = state.derivedState;
  
  // Define action dispatchers
  const initialize = useCallback((initialVersions: TargetVersion[]) => {
    console.log('🚀 Initializing app with', initialVersions.length, 'versions');
    dispatch({ 
      type: 'INITIALIZE', 
      payload: initialVersions 
    });
  }, []);
  
  const setCurrentVersion = useCallback((versionId: string) => {
    console.log('👉 Setting current version:', versionId);
    dispatch({ 
      type: 'SET_CURRENT_VERSION', 
      payload: versionId 
    });
  }, []);
  
  const addVersion = useCallback((versionData: Partial<TargetVersion>) => {
    console.log('➕ Adding new version');
    dispatch({ 
      type: 'ADD_VERSION', 
      payload: versionData 
    });
  }, []);
  
  const addTrial = useCallback((versionId: string, trial: Trial) => {
    console.log('➕ Adding trial to version:', versionId, 'trial:', trial.id);
    dispatch({ 
      type: 'ADD_TRIAL', 
      payload: { versionId, trial } 
    });
  }, []);
  
  const resetApp = useCallback((initialVersions: TargetVersion[]) => {
    console.log('🔄 Resetting app');
    dispatch({ 
      type: 'RESET_APP', 
      payload: initialVersions 
    });
  }, []);
  
  // Define selectors
  const getVersion = useCallback((versionId: string): TargetVersion | null => {
    return versionMap.get(versionId) || null;
  }, [versionMap]);
  
  const getTrials = useCallback((versionId: string): Trial[] => {
    return versionTrials.get(versionId) || [];
  }, [versionTrials]);
  
  const getCurrentTrials = useCallback((): Trial[] => {
    return currentVersion?.trials || [];
  }, [currentVersion]);
  
  const getTrialById = useCallback((trialId: string): Trial | null => {
    // Search through all versions for the trial
    for (const trials of versionTrials.values()) {
      const found = trials.find(t => t.id === trialId);
      if (found) return found;
    }
    return null;
  }, [versionTrials]);
  
  // Prepare context value
  const contextValue: VersionContextType = {
    // State
    versions,
    currentVersion,
    
    // Action dispatchers
    initialize,
    setCurrentVersion,
    addVersion,
    addTrial,
    resetApp,
    
    // Selectors
    getVersion,
    getTrials,
    getCurrentTrials,
    getTrialById
  };
  
  return (
    <VersionContext.Provider value={contextValue}>
      {children}
    </VersionContext.Provider>
  );
};