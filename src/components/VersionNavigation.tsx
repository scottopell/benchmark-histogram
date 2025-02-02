import { useVersionContext } from '../context/VersionContext';
import { parseVersionId, compareVersionIds } from '../versionId';

const ChevronLeft = (props: any) => (
    <svg
        {...props}
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRight = (props: any) => (
    <svg
        {...props}
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
);


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
        <div className="flex items-center space-x-4 mb-6 bg-white p-4 rounded-lg shadow">
            <button
                onClick={() => prevVersion && setCurrentVersion(prevVersion.id)}
                disabled={!prevVersion}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title={prevVersion ? `Switch to ${formatVersionDisplay(prevVersion.id)}` : 'No previous version'}
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1">
                <div className="relative">
                    <select
                        value={currentVersion?.id || ''}
                        onChange={(e) => setCurrentVersion(e.target.value)}
                        className="w-full p-2 pr-8 border rounded appearance-none bg-transparent cursor-pointer"
                    >
                        {sortedVersions.map((version) => (
                            <option key={version.id} value={version.id}>
                                {version.name} - {formatVersionDisplay(version.id)}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {currentVersion && (
                    <div className="mt-1 text-sm text-gray-500">
                        {currentVersion.trials.length} trials • Last updated:{' '}
                        {new Date(currentVersion.timestamp).toLocaleDateString()}
                    </div>
                )}
            </div>

            <button
                onClick={() => nextVersion && setCurrentVersion(nextVersion.id)}
                disabled={!nextVersion}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title={nextVersion ? `Switch to ${formatVersionDisplay(nextVersion.id)}` : 'No next version'}
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
};

export default VersionNavigation;