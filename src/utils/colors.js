export const VAR_COLORS = {
  x: '#A855F7',
  y: '#14B8A6',
  a: '#F97316',
  b: '#3B82F6',
  c: '#EF4444',
  d: '#EAB308',
  n: '#EC4899',
  m: '#06B6D4',
  k: '#84CC16',
  p: '#8B5CF6',
};

export function getVarColor(varName) {
  return VAR_COLORS[varName?.toLowerCase()] || '#A855F7';
}

export const PALETTE = {
  number: '#1e293b',
  operator: '#9ca3af',
  equals: '#f59e0b',
  fractionBar: '#8b5cf6',
  background: {
    start: '#e0c3fc',
    end: '#8ec5fc',
  },
};
