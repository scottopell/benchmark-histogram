// VersionContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { generateVersionId } from "../lib/versionId";
import { TargetVersion, Trial } from "@/types";

interface VersionContextType {
    versions: TargetVersion[];
    currentVersion: TargetVersion | null;
    addVersion: (version: Partial<TargetVersion>) => void;
    setVersions: (versions: TargetVersion[]) => void;
    setCurrentVersion: (versionId: string) => void;
    addTrialToVersion: (versionId: string, trial: Trial) => void;
    getVersion: (versionId: string) => TargetVersion | null;
}

const VersionContext = createContext<VersionContextType | null>(null);

export const useVersionContext = () => {
    const context = useContext(VersionContext);
    if (!context) {
        throw new Error('useVersionContext must be used within a VersionProvider');
    }
    return context;
};

export const VersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [versions, setVersionsState] = useState<TargetVersion[]>([]);
    const [currentVersion, setCurrentVersionState] = useState<TargetVersion | null>(null);

    // Wrapper for setVersions that also handles currentVersion initialization
    const setVersions = useCallback((newVersions: TargetVersion[]) => {
        setVersionsState(newVersions);
        if (newVersions.length > 0 && !currentVersion) {
            setCurrentVersionState(newVersions[0]);
        }
    }, [currentVersion]);

    // In VersionContext.tsx, update these sections:

    const addVersion = useCallback((versionData: Partial<TargetVersion>) => {
        const newVersion: TargetVersion = {
            id: generateVersionId(),
            name: versionData.name || `Version ${versions.length + 1}`,
            timestamp: Date.now(),
            trials: [],
            ...versionData
        };
        setVersionsState(prev => [...prev, newVersion]);
        setCurrentVersionState(newVersion);
    }, [versions.length]);


    const getVersion = useCallback((versionId: string) => {
        return versions.find(v => v.id === versionId) || null;
    }, [versions]);

    const setCurrentVersion = useCallback((versionId: string) => {
        const version = getVersion(versionId);
        if (version) {
            setCurrentVersionState(version);
        }
    }, [getVersion]);

    const addTrialToVersion = useCallback((versionId: string, trial: Trial) => {
        console.log('Adding trial to version', { versionId, trial });
        setVersionsState(prev => {
            const newVersions = prev.map((version: TargetVersion) => {
                if (version.id === versionId) {
                    return {
                        ...version,
                        trials: [...version.trials, trial],
                        timestamp: Date.now()
                    };
                }
                return version;
            });

            if (currentVersion?.id === versionId) {
                const updatedVersion = newVersions.find((v: TargetVersion) => v.id === versionId);
                if (updatedVersion) {
                    setCurrentVersionState(updatedVersion);
                }
            }
            return newVersions;
        });
    }, [currentVersion?.id]);

    const value = {
        versions,
        currentVersion,
        addVersion,
        setVersions,
        setCurrentVersion,
        addTrialToVersion,
        getVersion
    };

    return (
        <VersionContext.Provider value={value}>
            {children}
        </VersionContext.Provider>
    );
};