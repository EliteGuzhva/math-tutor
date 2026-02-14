import { piece as makePiece } from './expressionModel';
import { hasCasSimplificationDelta } from './casAdapter';

export function combineTermsByPieceIds(expr, dragId, targetId, options = {}) {
  if (!expr || expr.type !== 'expression' || !Array.isArray(expr.pieces)) return null;
  const entries = buildTermEntries(expr.pieces);
  if (!entries || entries.length === 0) return null;

  const dragIdx = findTermIndexByPieceId(entries, dragId);
  const targetIdx = findTermIndexByPieceId(entries, targetId);
  if (dragIdx < 0 || targetIdx < 0 || dragIdx === targetIdx) return null;

  const dragTerm = entries[dragIdx].model;
  const targetTerm = entries[targetIdx].model;
  if (dragTerm.signature !== targetTerm.signature) return null;

  const mergedCoeff = addRational(targetTerm.coeff, dragTerm.coeff);
  const nextTerms = [];

  entries.forEach((entry, idx) => {
    if (idx === dragIdx) return;
    if (idx === targetIdx) {
      if (!isZeroRational(mergedCoeff)) {
        nextTerms.push({
          ...entry,
          model: {
            ...entry.model,
            coeff: mergedCoeff,
          },
        });
      }
      return;
    }
    nextTerms.push(entry);
  });

  const normalizedPieces = rebuildExpressionFromTerms(nextTerms, options);
  return {
    type: 'expression',
    pieces: normalizedPieces,
  };
}

export function analyzeSimplifyState(expr, expected) {
  if (!expr || expr.type !== 'expression' || !Array.isArray(expr.pieces)) {
    return {
      solved: false,
      exactMatch: false,
      irreducible: false,
      canSimplify: false,
      possibleMoves: 0,
    };
  }

  const entries = buildTermEntries(expr.pieces);
  if (!entries || entries.length === 0) {
    return {
      solved: false,
      exactMatch: false,
      irreducible: false,
      canSimplify: false,
      possibleMoves: 0,
    };
  }

  const expectedPieces = normalizeExpectedToPieces(expected);
  const expectedEntries = expectedPieces ? buildTermEntries(expectedPieces) : null;
  const exactMatch = expectedEntries ? areTermMultisetsEqual(entries, expectedEntries) : false;

  const possibleMoves = countPossibleCombineMoves(entries);
  const hasInternalSimplify = entries.some((entry) => entry.model.internalSimplifiable);
  const casHasDelta = hasCasSimplificationDelta(expr.pieces);

  const hasRuleSimplify = possibleMoves > 0 || hasInternalSimplify;
  const canSimplify = hasRuleSimplify || casHasDelta;
  const irreducible = !canSimplify;

  return {
    solved: exactMatch || irreducible,
    exactMatch,
    irreducible,
    canSimplify,
    possibleMoves,
    hasInternalSimplify,
    casHasDelta,
  };
}

export function isSimplifySolved(expr, expected) {
  return analyzeSimplifyState(expr, expected).solved;
}

function normalizeExpectedToPieces(expected) {
  if (typeof expected === 'string') {
    const parsed = parseInt(expected, 10);
    if (Number.isNaN(parsed)) return null;
    return [makePiece({ type: 'number', value: parsed, sign: '+' })];
  }

  if (Array.isArray(expected)) {
    return expected.map((token) => ({ ...token }));
  }

  return null;
}

function areTermMultisetsEqual(leftEntries, rightEntries) {
  if (!Array.isArray(leftEntries) || !Array.isArray(rightEntries)) return false;
  const left = leftEntries.map((entry) => serializeTerm(entry.model)).sort();
  const right = rightEntries.map((entry) => serializeTerm(entry.model)).sort();

  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }

  return true;
}

function serializeTerm(model) {
  if (!model) return '';
  const coeff = reduceRational(model.coeff);
  return `${model.signature}::${coeff.num}/${coeff.den}`;
}

function countPossibleCombineMoves(entries) {
  let pairs = 0;

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (entries[i].model.signature === entries[j].model.signature) {
        pairs += 1;
      }
    }
  }

  return pairs;
}

function findTermIndexByPieceId(entries, pieceId) {
  for (let i = 0; i < entries.length; i += 1) {
    const range = entries[i].range;
    for (let j = range.start; j <= range.end; j += 1) {
      if (entries[i].source?.[j]?.id === pieceId) return i;
    }
  }
  return -1;
}

function buildTermEntries(pieces) {
  const ranges = getTopLevelTermRanges(pieces);
  if (ranges.length === 0) return [];

  const entries = [];
  for (const range of ranges) {
    const rawTerm = pieces.slice(range.start, range.end + 1).map((p) => ({ ...p }));
    const model = parseTermModel(rawTerm);
    if (!model) return null;

    entries.push({
      range,
      model,
      source: pieces,
    });
  }

  return entries;
}

function rebuildExpressionFromTerms(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [makePiece({ type: 'number', value: 0, sign: '+' })];
  }

  const output = [];
  entries.forEach((entry) => {
    const termPieces = buildTermPiecesFromModel(entry.model, options);
    if (!termPieces || termPieces.length === 0) return;
    output.push(...termPieces);
  });

  if (output.length === 0) {
    return [makePiece({ type: 'number', value: 0, sign: '+' })];
  }

  const normalized = output.map((p) => ({ ...p }));
  const firstMovable = normalized.find((p) => isMovablePiece(p));
  if (firstMovable && (!firstMovable.sign || firstMovable.sign === '')) {
    firstMovable.sign = '+';
  }
  return normalized;
}

function parseTermModel(termPieces) {
  if (!Array.isArray(termPieces) || termPieces.length === 0) return null;

  const local = termPieces.map((p) => ({ ...p }));
  const leadIndex = local.findIndex(isMovablePiece);
  if (leadIndex < 0) return null;

  const leadSign = local[leadIndex].sign === '-' ? -1 : 1;
  local[leadIndex].sign = '';

  const factors = parseTopLevelFactors(local);
  if (!factors || factors.length === 0) return null;

  const coeff = { num: leadSign, den: 1 };
  const numVars = new Map();
  const denVars = new Map();
  const numOpaque = [];
  const denOpaque = [];

  factors.forEach((factor) => {
    const numeric = parseNumericFactor(factor.pieces);
    if (numeric != null) {
      if (factor.role === 'den') {
        coeff.den *= numeric;
      } else {
        coeff.num *= numeric;
      }
      return;
    }

    const variable = parseVariableFactor(factor.pieces);
    if (variable) {
      const target = factor.role === 'den' ? denVars : numVars;
      target.set(variable.base, (target.get(variable.base) || 0) + variable.power);
      return;
    }

    const normalizedOpaque = normalizeOpaqueFactorPieces(factor.pieces);
    const opaqueKey = serializePieces(normalizedOpaque);
    const opaque = { key: opaqueKey, pieces: normalizedOpaque };
    if (factor.role === 'den') {
      denOpaque.push(opaque);
    } else {
      numOpaque.push(opaque);
    }
  });

  let internalSimplifiable = false;

  for (const [base, numPow] of numVars.entries()) {
    const denPow = denVars.get(base) || 0;
    if (!denPow) continue;

    const minPow = Math.min(numPow, denPow);
    if (minPow > 0) {
      internalSimplifiable = true;
      numVars.set(base, numPow - minPow);
      denVars.set(base, denPow - minPow);
    }
  }

  for (const [base, pow] of [...numVars.entries()]) {
    if (pow <= 0) numVars.delete(base);
  }
  for (const [base, pow] of [...denVars.entries()]) {
    if (pow <= 0) denVars.delete(base);
  }

  const denOpaqueByKey = new Map();
  denOpaque.forEach((item, idx) => {
    if (!denOpaqueByKey.has(item.key)) denOpaqueByKey.set(item.key, []);
    denOpaqueByKey.get(item.key).push(idx);
  });

  const keptNumOpaque = [];
  const denRemove = new Set();
  numOpaque.forEach((item) => {
    const matches = denOpaqueByKey.get(item.key);
    if (matches && matches.length) {
      internalSimplifiable = true;
      const idx = matches.shift();
      denRemove.add(idx);
    } else {
      keptNumOpaque.push(item);
    }
  });

  const keptDenOpaque = denOpaque.filter((_, idx) => !denRemove.has(idx));

  const reducedCoeff = reduceRational(coeff);
  if (reducedCoeff.num !== coeff.num || reducedCoeff.den !== coeff.den) {
    internalSimplifiable = true;
  }

  const signature = buildTermSignature(numVars, denVars, keptNumOpaque, keptDenOpaque);
  const model = {
    coeff: reducedCoeff,
    numVars,
    denVars,
    numOpaque: keptNumOpaque,
    denOpaque: keptDenOpaque,
    signature,
    internalSimplifiable,
  };

  const canonicalPieces = buildTermPiecesFromModel(model);
  if (!piecesSemanticallyEqual(termPieces, canonicalPieces)) {
    model.internalSimplifiable = true;
  }

  return model;
}

function buildTermSignature(numVars, denVars, numOpaque, denOpaque) {
  const numVarPart = serializePowerMap(numVars);
  const denVarPart = serializePowerMap(denVars);
  const numOpaquePart = numOpaque.map((f) => f.key).sort().join('|');
  const denOpaquePart = denOpaque.map((f) => f.key).sort().join('|');
  return `nv:${numVarPart};dv:${denVarPart};no:${numOpaquePart};do:${denOpaquePart}`;
}

function serializePowerMap(map) {
  return [...map.entries()]
    .filter(([, power]) => power > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([base, power]) => `${base}^${power}`)
    .join('|');
}

function parseNumericFactor(factorPieces) {
  if (!Array.isArray(factorPieces) || factorPieces.length !== 1) return null;
  const only = factorPieces[0];
  if (only?.type !== 'number') return null;
  const value = Number(only.value);
  if (!Number.isFinite(value)) return null;
  return Math.abs(value);
}

function parseVariableFactor(factorPieces) {
  if (!Array.isArray(factorPieces) || factorPieces.length !== 1) return null;
  const only = factorPieces[0];
  if (only?.type !== 'variable') return null;

  const name = String(only.name || '');
  const match = name.match(/^([A-Za-z]+)\^(\d+)$/);
  if (match) {
    const power = Number(match[2]);
    if (!Number.isInteger(power) || power <= 0) return null;
    return { base: match[1], power };
  }

  return { base: name, power: 1 };
}

function normalizeOpaqueFactorPieces(factorPieces) {
  const cloned = factorPieces.map((piece) => ({ ...piece }));

  if (!cloned.length) return cloned;
  const firstMovable = cloned.find(isMovablePiece);
  if (firstMovable && (firstMovable.sign === '+' || firstMovable.sign === '-')) {
    firstMovable.sign = '';
  }

  return cloned.map((p) => stripRuntimeFields(p));
}

function stripRuntimeFields(piece) {
  if (!piece) return piece;
  const out = {
    type: piece.type,
    sign: piece.sign || '',
  };
  if (piece.type === 'number' || piece.type === 'operator' || piece.type === 'paren') {
    out.value = piece.value;
  }
  if (piece.type === 'variable') {
    out.name = piece.name;
  }
  return out;
}

function serializePieces(pieces) {
  return JSON.stringify(pieces.map(stripRuntimeFields));
}

function piecesSemanticallyEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const left = stripRuntimeFields(a[i]);
    const right = stripRuntimeFields(b[i]);
    if (JSON.stringify(left) !== JSON.stringify(right)) return false;
  }

  return true;
}

function buildTermPiecesFromModel(model) {
  if (!model) return [];
  const coeff = reduceRational(model.coeff);
  if (isZeroRational(coeff)) return [];

  const sign = coeff.num < 0 ? '-' : '+';
  const absNum = Math.abs(coeff.num);
  const absDen = coeff.den;

  const numGroups = [];
  const denGroups = [];

  const numSymbolGroups = [];
  [...model.numVars.entries()]
    .filter(([, power]) => power > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([base, power]) => {
      numSymbolGroups.push([{ type: 'variable', name: power === 1 ? base : `${base}^${power}`, sign: '' }]);
    });

  model.numOpaque
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .forEach((opaque) => {
      numSymbolGroups.push(opaque.pieces.map((p) => ({ ...p })));
    });

  const firstStartsWithParen = numSymbolGroups[0]?.[0]?.type === 'paren';
  const needsNumCoeff = absNum !== 1 || numSymbolGroups.length === 0 || firstStartsWithParen;
  if (needsNumCoeff) {
    numGroups.push([makeBareNumberPiece(absNum)]);
  }
  numGroups.push(...numSymbolGroups);

  const denSymbolGroups = [];
  [...model.denVars.entries()]
    .filter(([, power]) => power > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([base, power]) => {
      denSymbolGroups.push([{ type: 'variable', name: power === 1 ? base : `${base}^${power}`, sign: '' }]);
    });

  model.denOpaque
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .forEach((opaque) => {
      denSymbolGroups.push(opaque.pieces.map((p) => ({ ...p })));
    });

  if (absDen !== 1 || denSymbolGroups.length > 0) {
    if (absDen !== 1 || denSymbolGroups.length === 0) {
      denGroups.push([makeBareNumberPiece(absDen)]);
    }
    denGroups.push(...denSymbolGroups);
  }

  const pieces = [];
  appendFactorGroupsAsProduct(pieces, numGroups);

  if (denGroups.length > 0) {
    pieces.push(makePiece({ type: 'operator', value: '/', sign: '+' }));
    appendFactorGroupsAsProduct(pieces, denGroups);
  }

  const lead = pieces.find(isMovablePiece);
  if (lead) {
    lead.sign = sign;
  }

  return pieces;
}

function appendFactorGroupsAsProduct(out, groups) {
  groups.forEach((group, idx) => {
    if (idx > 0) {
      out.push(makePiece({ type: 'operator', value: '*', sign: '+' }));
    }

    group.forEach((token) => {
      if (token.type === 'number') {
        out.push(makePiece({ type: 'number', value: Number(token.value), sign: token.sign || '' }));
      } else if (token.type === 'variable') {
        out.push(makePiece({ type: 'variable', name: token.name, sign: token.sign || '' }));
      } else if (token.type === 'operator') {
        out.push(makePiece({ type: 'operator', value: token.value, sign: token.sign || '+' }));
      } else if (token.type === 'paren') {
        out.push(makePiece({ type: 'paren', value: token.value, sign: token.sign || '' }));
      }
    });
  });
}

function makeBareNumberPiece(value) {
  return { type: 'number', value: Number(value), sign: '' };
}

function parseTopLevelFactors(source) {
  if (!Array.isArray(source) || source.length === 0) return null;

  const factors = [];
  let i = 0;
  while (i < source.length) {
    const range = resolveTopLevelFactorForIndex(source, i);
    if (!range || range.start !== i) return null;

    const role = factors.length === 0 ? 'num' : source[i - 1]?.value === '/' ? 'den' : 'num';
    factors.push({
      role,
      pieces: source.slice(range.start, range.end + 1).map((p) => ({ ...p })),
    });

    i = range.end + 1;
    if (i >= source.length) break;
    if (!isTopLevelMulDivOperator(source, i)) return null;
    i += 1;
  }

  return factors;
}

function isMovablePiece(piece) {
  return piece?.type === 'number' || piece?.type === 'variable';
}

function getPieceDepth(pieces, index) {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    const token = pieces[i];
    if (token?.type === 'paren' && token.value === '(') depth += 1;
    if (token?.type === 'paren' && token.value === ')') depth -= 1;
  }
  return depth;
}

function resolveTopLevelFactorForIndex(source, index) {
  if (!Array.isArray(source) || index < 0 || index >= source.length) return null;

  const topLevelParenRange = findTopLevelParenRangeContainingIndex(source, index);
  if (topLevelParenRange) return topLevelParenRange;

  if (getPieceDepth(source, index) !== 0) return null;
  if (!isMovablePiece(source[index])) return null;

  return { start: index, end: index };
}

function findTopLevelParenRangeContainingIndex(source, targetIndex) {
  if (!Array.isArray(source) || targetIndex < 0 || targetIndex >= source.length) return null;

  const tokenAtTarget = source[targetIndex];
  if (tokenAtTarget?.type !== 'paren' && getPieceDepth(source, targetIndex) === 0) {
    return null;
  }

  let depth = 0;
  const stack = [];

  for (let i = 0; i < source.length; i += 1) {
    const token = source[i];

    if (token?.type === 'paren' && token.value === '(') {
      stack.push({ index: i, depthBefore: depth });
      depth += 1;
      continue;
    }

    if (token?.type === 'paren' && token.value === ')') {
      depth -= 1;
      const open = stack.pop();
      if (!open) return null;

      if (open.depthBefore === 0 && open.index <= targetIndex && targetIndex <= i) {
        return { start: open.index, end: i };
      }
    }
  }

  return null;
}

function isTopLevelMulDivOperator(source, index) {
  if (!Array.isArray(source) || index < 0 || index >= source.length) return false;
  const token = source[index];
  if (token?.type !== 'operator') return false;
  if (token.value !== '*' && token.value !== '/') return false;
  return getPieceDepth(source, index) === 0;
}

function getAdditiveTermRangeForIndex(source, index) {
  const anchor = resolveTopLevelFactorForIndex(source, index);
  if (!anchor) return null;

  let start = anchor.start;
  let end = anchor.end;

  while (start - 1 >= 0 && isTopLevelMulDivOperator(source, start - 1)) {
    const leftRange = resolveTopLevelFactorForIndex(source, start - 2);
    if (!leftRange) break;
    start = leftRange.start;
  }

  while (end + 1 < source.length && isTopLevelMulDivOperator(source, end + 1)) {
    const rightRange = resolveTopLevelFactorForIndex(source, end + 2);
    if (!rightRange) break;
    end = rightRange.end;
  }

  return { start, end };
}

function getTopLevelTermRanges(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return [];

  const ranges = [];
  const seen = new Set();

  for (let i = 0; i < pieces.length; i += 1) {
    const token = pieces[i];
    if (!isMovablePiece(token)) continue;
    if (getPieceDepth(pieces, i) !== 0) continue;

    const range = getAdditiveTermRangeForIndex(pieces, i);
    if (!range) continue;
    const key = `${range.start}:${range.end}`;
    if (seen.has(key)) continue;

    seen.add(key);
    ranges.push(range);
  }

  if (ranges.length === 0) {
    return [{ start: 0, end: pieces.length - 1 }];
  }

  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

function reduceRational(r) {
  if (!r || typeof r.num !== 'number' || typeof r.den !== 'number') {
    return { num: 0, den: 1 };
  }

  if (r.den === 0) return { num: r.num, den: 1 };
  if (r.num === 0) return { num: 0, den: 1 };

  const sign = r.den < 0 ? -1 : 1;
  const num = r.num * sign;
  const den = Math.abs(r.den);
  const d = gcd(num, den);
  return {
    num: num / d,
    den: den / d,
  };
}

function addRational(a, b) {
  const left = reduceRational(a);
  const right = reduceRational(b);
  return reduceRational({
    num: left.num * right.den + right.num * left.den,
    den: left.den * right.den,
  });
}

function isZeroRational(r) {
  return reduceRational(r).num === 0;
}
