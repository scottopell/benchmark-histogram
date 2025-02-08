const adjectives = [
  'swift', 'bright', 'calm', 'deep', 'fresh', 'bold', 'keen', 'pure', 'wise', 'warm',
  'quick', 'light', 'sharp', 'soft', 'cool', 'clear', 'dark', 'dry', 'firm', 'free',
  'vast', 'wild', 'young', 'raw', 'safe', 'rare', 'rich', 'rough', 'round', 'royal',
  'broad', 'brave', 'brief', 'fair', 'fine', 'fleet', 'glad', 'grand', 'great', 'green',
  'prime', 'proud', 'real', 'ripe', 'sweet', 'tall', 'tame', 'true', 'nice', 'plain',
  'lean', 'loud', 'main', 'neat', 'next', 'pale', 'pink', 'flat', 'gold', 'good'
];

const nouns = [
  'wolf', 'hawk', 'bear', 'deer', 'fox', 'owl', 'lion', 'seal', 'crow', 'dove',
  'swan', 'eagle', 'whale', 'tiger', 'lynx', 'raven', 'snake', 'horse', 'shark', 'crane',
  'duck', 'elk', 'frog', 'goat', 'hare', 'kite', 'lark', 'mole', 'moth', 'mouse',
  'newt', 'pike', 'puma', 'rail', 'ram', 'ray', 'sage', 'seal', 'shrew', 'skunk',
  'snail', 'stork', 'swan', 'teal', 'thrush', 'toad', 'trout', 'vole', 'wasp', 'wren',
  'bass', 'bison', 'boar', 'carp', 'chad', 'clam', 'crab', 'doe', 'eel', 'finch'
];

const verbs = [
  'runs', 'leaps', 'flies', 'dives', 'swims', 'soars', 'walks', 'jumps', 'glides', 'moves',
  'rides', 'flows', 'races', 'turns', 'rolls', 'leads', 'falls', 'rises', 'spins', 'drifts',
  'bends', 'binds', 'bites', 'blows', 'breaks', 'brings', 'builds', 'burns', 'buys', 'calls',
  'casts', 'comes', 'costs', 'deals', 'does', 'draws', 'drinks', 'drives', 'eats', 'falls',
  'feeds', 'feels', 'finds', 'gains', 'gets', 'gives', 'goes', 'grows', 'hangs', 'has',
  'hears', 'helps', 'holds', 'keeps', 'knows', 'leaves', 'leads', 'lets', 'lies', 'lives'
];

const getSecureRandom = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
};

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(getSecureRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface IdOptions {
  separator?: string;
  includeVerb?: boolean;
}

export const generateId = (options: IdOptions = {}): string => {
  const {
    separator = '-',
    includeVerb = true
  } = options;

  const shuffledAdj = shuffleArray(adjectives);
  const shuffledNouns = shuffleArray(nouns);
  const shuffledVerbs = shuffleArray(verbs);

  const adj = shuffledAdj[Math.floor(getSecureRandom() * shuffledAdj.length)];
  const noun = shuffledNouns[Math.floor(getSecureRandom() * shuffledNouns.length)];
  const verb = shuffledVerbs[Math.floor(getSecureRandom() * shuffledVerbs.length)];

  const parts = [adj, noun];
  if (includeVerb) parts.push(verb);

  return parts.join(separator);
};
