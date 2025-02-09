// random.ts
export const generateSeedFromId = (id: string): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

export const xorshift = (seed: number): () => number => {
    let state = seed;
    return () => {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
};

// A wrapper to make the random number generator more ergonomic for initialization
export class SeededRandom {
    private rng: () => number;

    constructor(seed: number) {
        this.rng = xorshift(seed);
    }

    next(): number {
        return this.rng();
    }

    range(min: number, max: number): number {
        return min + (max - min) * this.next();
    }

    rangeInt(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
}