// utils/versionId.ts

// Generate a random hex string of specified length
const generateShortSha = (length: number = 7): string => {
    const chars = '0123456789abcdef';
    return Array.from(
        { length },
        () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
};

export interface VersionIdOptions {
    tag?: string;       // Optional semantic version tag
    length?: number;    // Length of the short SHA (default: 7)
}

// Validates semantic version format
const isValidSemanticVersion = (version: string): boolean => {
    const pattern = /^\d+\.\d+(\.\d+)?$/;
    return pattern.test(version);
};

export const generateVersionId = (options: VersionIdOptions = {}): string => {
    const { tag, length = 7 } = options;
    const sha = generateShortSha(length);

    if (tag) {
        if (!isValidSemanticVersion(tag)) {
            throw new Error('Invalid semantic version format. Use format: x.y or x.y.z');
        }
        return `${sha}@${tag}`;
    }

    return sha;
};

// Parse a version ID back into its components
export const parseVersionId = (id: string): { sha: string; tag?: string } => {
    const parts = id.split('@');
    return {
        sha: parts[0],
        tag: parts[1]
    };
};

// Compare two version IDs based on their tags
export const compareVersionIds = (idA: string, idB: string): number => {
    const { tag: tagA } = parseVersionId(idA);
    const { tag: tagB } = parseVersionId(idB);

    if (!tagA && !tagB) return 0;
    if (!tagA) return -1;
    if (!tagB) return 1;

    const partsA = tagA.split('.').map(Number);
    const partsB = tagB.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const a = partsA[i] || 0;
        const b = partsB[i] || 0;
        if (a !== b) return a - b;
    }

    return 0;
};