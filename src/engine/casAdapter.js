import { create, all } from 'mathjs';

const math = create(all, {
  predictable: true,
  number: 'number',
});

export function canonicalizeWithCas(pieces) {
  const source = piecesToCasString(pieces);
  if (!source) return null;

  try {
    return math.simplify(source).toString({ parenthesis: 'auto' });
  } catch {
    return null;
  }
}

export function areEquivalentWithCas(leftPieces, rightPieces) {
  const left = piecesToCasString(leftPieces);
  const right = piecesToCasString(rightPieces);
  if (!left || !right) return false;

  try {
    const delta = math.simplify(`(${left}) - (${right})`).toString({ parenthesis: 'auto' });
    return delta === '0';
  } catch {
    return false;
  }
}

export function hasCasSimplificationDelta(pieces) {
  const source = piecesToCasString(pieces);
  if (!source) return false;

  try {
    const simplified = math.simplify(source).toString({ parenthesis: 'auto' });
    if (!simplified) return false;

    // Compare a normalized textual form. This is heuristic but stable enough for gating
    // whether additional CAS-level simplification likely exists.
    const normalizedSource = normalizeMathText(source);
    const normalizedSimplified = normalizeMathText(simplified);
    return normalizedSource !== normalizedSimplified;
  } catch {
    return false;
  }
}

function piecesToCasString(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return null;

  let out = '';

  for (let i = 0; i < pieces.length; i += 1) {
    const token = pieces[i];

    if (token.type === 'number' || token.type === 'variable') {
      const sign = token.sign === '-' ? '-' : token.sign === '+' ? '+' : '';
      const prev = pieces[i - 1];
      const canSkipPlus = !prev || (prev.type === 'operator') || (prev.type === 'paren' && prev.value === '(');

      if (sign === '-') {
        out += '-';
      } else if (sign === '+' && !canSkipPlus) {
        out += '+';
      }

      if (token.type === 'number') {
        out += String(token.value);
      } else {
        out += normalizeVariableNameForCas(token.name);
      }
      continue;
    }

    if (token.type === 'operator') {
      out += token.value;
      continue;
    }

    if (token.type === 'paren') {
      out += token.value;
      continue;
    }

    return null;
  }

  return out || null;
}

function normalizeVariableNameForCas(name) {
  const raw = String(name || '');
  const match = raw.match(/^([A-Za-z]+)\^(\d+)$/);
  if (match) {
    return `${match[1]}^${match[2]}`;
  }

  return raw;
}

function normalizeMathText(value) {
  return String(value || '').replace(/\s+/g, '').replace(/\*/g, '*');
}
