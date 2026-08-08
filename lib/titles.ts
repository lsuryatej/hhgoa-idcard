// Builder class: deterministic from the person's own inputs, so the same name +
// stack always yields the same title. No randomness, so a re-render never
// silently changes someone's card after they've shared it.

const CLASSES = [
  "TERMINAL DWELLER",
  "MIDNIGHT COMMITTER",
  "REGEX WHISPERER",
  "LATENCY HUNTER",
  "CACHE INVALIDATOR",
  "OFF-BY-ONE ORACLE",
  "SEGFAULT SURVIVOR",
  "MERGE CONFLICT MEDIATOR",
  "YAML NEGOTIATOR",
  "COLD START SLAYER",
  "BUNDLE SIZE MINIMALIST",
  "PROD PATCHER",
  "NULL POINTER PROPHET",
  "RUBBER DUCK SENSEI",
  "STACKTRACE ARCHAEOLOGIST",
  "FRIDAY DEPLOYER",
  "TABS SUPREMACIST",
  "VIM ESCAPE ARTIST",
  "RACE CONDITION REFEREE",
  "DEPENDENCY GARDENER",
  "PIXEL ALIGNMENT ZEALOT",
  "GREPPER OF LAST RESORT",
  "MEMORY LEAK PLUMBER",
  "SCHEMA DIPLOMAT",
  "ROLLBACK ROMANTIC",
  "FLAKY TEST EXORCIST",
  "SHIP-IT SEPARATIST",
  "BENCHMARK PURIST",
  "EDGE CASE CARTOGRAPHER",
  "UPTIME LOYALIST",
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function builderClass(name: string, stack: string): string {
  const seed = `${name.trim().toLowerCase()}::${stack.trim().toLowerCase()}`;
  if (!seed.replace(/[:\s]/g, "")) return CLASSES[0];
  return CLASSES[hash(seed) % CLASSES.length];
}

// Six-digit pass number, same determinism rule as the class.
export function passNumber(name: string, stack: string): string {
  const seed = `${name.trim().toLowerCase()}|${stack.trim().toLowerCase()}`;
  return String((hash(seed) % 900000) + 100000);
}
