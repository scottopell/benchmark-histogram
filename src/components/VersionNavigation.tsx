import { useVersionContext } from '../context/VersionContext';
import { parseVersionId, compareVersionIds } from '../lib/versionId';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const VersionNavigation = () => {
    const { versions, currentVersion, setCurrentVersion } = useVersionContext();

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

    const formatVersionDisplay = (id: string) => {
        const { sha, tag } = parseVersionId(id);
        return tag ? `${tag} (${sha.slice(0, 4)})` : sha;
    };

    return (
        <Card className="mb-6">
            <CardContent className="flex items-center space-x-4 py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => prevVersion && setCurrentVersion(prevVersion.id)}
                    disabled={!prevVersion}
                    title={prevVersion ? `Switch to ${formatVersionDisplay(prevVersion.id)}` : 'No previous version'}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1 space-y-1">
                    <Select
                        value={currentVersion?.id || ''}
                        onValueChange={setCurrentVersion}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select version">
                                {currentVersion && `${currentVersion.name} - ${formatVersionDisplay(currentVersion.id)}`}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {sortedVersions.map((version) => (
                                <SelectItem key={version.id} value={version.id}>
                                    {version.name} - {formatVersionDisplay(version.id)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {currentVersion && (
                        <p className="text-sm text-muted-foreground">
                            {currentVersion.trials.length} trials • Last updated:{' '}
                            {new Date(currentVersion.timestamp).toLocaleDateString()}
                        </p>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => nextVersion && setCurrentVersion(nextVersion.id)}
                    disabled={!nextVersion}
                    title={nextVersion ? `Switch to ${formatVersionDisplay(nextVersion.id)}` : 'No next version'}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </CardContent>
        </Card>
    );
};

export default VersionNavigation;