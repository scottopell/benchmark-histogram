import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';
import { generateVersionId } from "../lib/versionId";
import { TargetVersion, Trial } from "@/types";

interface VersionContextType {
    versions: TargetVersion[];
    currentVersion: TargetVersion | null;
    addVersion: (version: Partial<TargetVersion>) => void;
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
    const [versions, setVersions] = useState<TargetVersion[]>([]);
    const [currentVersion, setCurrentVersionState] = useState<TargetVersion | null>(null);
    const initialized = useRef(false);

    // Initialize with a single version if none exist
    useEffect(() => {
        console.log('Initialization check:', { initialized: initialized.current, versionsLength: versions.length });
        if (!initialized.current && versions.length === 0) {
            initialized.current = true;
            const initialVersion: TargetVersion = {
                id: generateVersionId(),
                name: "Initial Version",
                timestamp: Date.now(),
                trials: []
            };
            setVersions([initialVersion]);
            setCurrentVersionState(initialVersion);
        }
    }, [versions.length]);

    const addVersion = useCallback((versionData: Partial<TargetVersion>) => {
        const newVersion: TargetVersion = {
            id: generateVersionId(),
            name: versionData.name || `Version ${versions.length + 1}`,
            timestamp: Date.now(),
            trials: [],
            ...versionData
        };

        setVersions(prev => [...prev, newVersion]);
        setCurrentVersionState(newVersion); // Automatically switch to new version
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

        setVersions(prev => {
            const newVersions = prev.map(version => {
                if (version.id === versionId) {
                    return {
                        ...version,
                        trials: [...version.trials, trial],
                        timestamp: Date.now() // Update timestamp when modified
                    };
                }
                return version;
            });

            // Update current version state if this is the current version
            if (currentVersion?.id === versionId) {
                const updatedVersion = newVersions.find(v => v.id === versionId);
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