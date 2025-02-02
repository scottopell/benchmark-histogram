import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { generateId } from "../id";
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
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

    // Derive currentVersion from versions and currentVersionId
    const currentVersion = versions.find(v => v.id === currentVersionId) || null;

    const getVersion = useCallback((versionId: string) => {
        return versions.find(v => v.id === versionId) || null;
    }, [versions]);

    const addVersion = useCallback((versionData: Partial<TargetVersion>) => {
        const newVersion: TargetVersion = {
            id: generateId(),
            name: versionData.name || `Version ${versions.length + 1}`,
            timestamp: Date.now(),
            trials: [],
            ...versionData
        };

        setVersions(prev => [...prev, newVersion]);
        setCurrentVersionId(newVersion.id);
    }, [versions.length]);

    const setCurrentVersion = useCallback((versionId: string) => {
        if (versions.some(v => v.id === versionId)) {
            setCurrentVersionId(versionId);
        }
    }, [versions]);

    const addTrialToVersion = useCallback((versionId: string, trial: Trial) => {
        console.log('Adding trial to version', { versionId, trial });

        setVersions(prev => {
            const newVersions = prev.map(version => {
                if (version.id === versionId) {
                    return {
                        ...version,
                        trials: [...version.trials, trial]
                    };
                }
                return version;
            });
            return newVersions;
        });
    }, []);

    // Initialize with a version if none exists
    useEffect(() => {
        if (versions.length === 0) {
            const initialVersion: TargetVersion = {
                id: generateId(),
                name: "Initial Version",
                timestamp: Date.now(),
                trials: []
            };
            setVersions([initialVersion]);
            setCurrentVersionId(initialVersion.id);
        }
    }, []);

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