import { useVersionContext } from '../context/VersionContext';
import { compareVersionIds } from '../lib/versionId';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Experiment } from '@/types';

const VersionNavigation = () => {
  const { 
    versions, 
    experiments,
    currentVersion, 
    currentExperiment,
    setCurrentVersion,
    setCurrentExperiment,
    getExperimentsByVersion,
    getRunsByVersion
  } = useVersionContext();

  // Sort versions by tag if available
  const sortedVersions = [...versions].sort((a, b) =>
    compareVersionIds(a.id, b.id)
  );

  const currentIndex = currentVersion
    ? sortedVersions.findIndex(v => v.id === currentVersion.id)
    : -1;

  const prevVersion = currentIndex > 0 ? sortedVersions[currentIndex - 1] : null;
  const nextVersion = currentIndex < sortedVersions.length - 1
    ? sortedVersions[currentIndex + 1]
    : null;

  // Get available experiments for the current version
  const availableExperimentIds = currentVersion 
    ? getExperimentsByVersion(currentVersion.id)
    : [];
    
  const availableExperiments = availableExperimentIds
    .map(id => experiments.find(e => e.id === id))
    .filter(e => e !== undefined) as Experiment[];
    
  // Get run count for the current version
  const currentVersionRuns = currentVersion 
    ? getRunsByVersion(currentVersion.id)
    : [];

  const handleVersionChange = (versionId: string) => {
    console.log('🔄 Navigation - Changing version to:', versionId);
    setCurrentVersion(versionId);
  };
  
  const handleExperimentChange = (experimentId: string) => {
    console.log('🔄 Navigation - Changing experiment to:', experimentId);
    setCurrentExperiment(experimentId);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Version Selector */}
      <div className="flex items-center space-x-4 py-2 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => prevVersion && handleVersionChange(prevVersion.id)}
          disabled={!prevVersion}
          title={prevVersion ? `Switch to ${prevVersion.name}` : 'No previous version'}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 space-y-1">
          <Select
            value={currentVersion?.id || ''}
            onValueChange={handleVersionChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select version">
                {currentVersion && currentVersion.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortedVersions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentVersion && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {currentVersionRuns.length} {currentVersionRuns.length === 1 ? 'experiment run' : 'experiment runs'} • 
                Last updated:{' '}
                {new Date(currentVersion.timestamp).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => nextVersion && handleVersionChange(nextVersion.id)}
          disabled={!nextVersion}
          title={nextVersion ? `Switch to ${nextVersion.name}` : 'No next version'}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Experiment Selector - only show if we have a version selected */}
      {currentVersion && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Experiment:</span>
          <div className="flex flex-wrap gap-2">
            {availableExperiments.length > 0 ? (
              availableExperiments.map(experiment => (
                <button
                  key={experiment.id}
                  onClick={() => handleExperimentChange(experiment.id)}
                  className={`px-2 py-1 text-xs rounded-full border ${
                    currentExperiment?.id === experiment.id
                      ? `border-${experiment.color} bg-${experiment.color}33`
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                  style={{
                    borderColor: currentExperiment?.id === experiment.id ? experiment.color : undefined,
                    backgroundColor: currentExperiment?.id === experiment.id ? `${experiment.color}33` : undefined,
                    color: currentExperiment?.id === experiment.id ? experiment.color : undefined
                  }}
                >
                  {experiment.name}
                </button>
              ))
            ) : (
              <button
                onClick={() => {}} // No-op since there are no experiments yet
                className="px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-500"
              >
                idle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionNavigation;