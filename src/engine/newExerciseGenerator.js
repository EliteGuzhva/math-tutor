import { piece, equation, uid } from './expressionModel';

// ============================================================================
// Utility: seeded pseudo-random number generator (mulberry32)
// Allows reproducible exercises when needed, but we default to Math.random
// ============================================================================

function createRng(seed) {
  if (seed == null) return () => Math.random();
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Random helpers
// ============================================================================

const VARS_POOL = ['x', 'y', 'z', 'a', 'b', 'c', 'd', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'k'];

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN(rng, arr, n) {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

function randSign(rng) {
  return rng() < 0.5 ? '+' : '-';
}

function randCoeff(rng, min, max) {
  return String(randInt(rng, min, max));
}

// ============================================================================
// MODE 1: ISOLATE VARIABLE — procedural generator
// 4 difficulty levels, infinite exercises
//
// Russian math school grades 7-9:
//   Level 1: One-step equations (ax=b, x+a=b, x-a=b)
//   Level 2: Two-step equations (ax+b=c, ax-b=c)
//   Level 3: Multi-term, variables both sides, coefficient extraction
//   Level 4: Fractions, parentheses, variable in denominator
// ============================================================================

function generateIsolateLevel1(rng) {
  const vars = pickN(rng, VARS_POOL, 3);
  const target = vars[0];
  const patterns = [
    // ax = b
    () => ({
      left: [randCoeff(rng, 2, 9), '*', target],
      right: [randCoeff(rng, 4, 30)],
      target,
      ops: ['*'],
    }),
    // x + a = b
    () => ({
      left: [target, '+', randCoeff(rng, 1, 15)],
      right: [randCoeff(rng, 5, 30)],
      target,
      ops: ['+', '-'],
    }),
    // x - a = b
    () => ({
      left: [target, '-', randCoeff(rng, 1, 12)],
      right: [randCoeff(rng, 1, 20)],
      target,
      ops: ['+', '-'],
    }),
    // ax = b (variable)
    () => ({
      left: [randCoeff(rng, 2, 8), '*', target],
      right: [vars[1]],
      target,
      ops: ['*'],
    }),
    // x / a = b
    () => ({
      left: [target, '/', randCoeff(rng, 2, 7)],
      right: [vars[1]],
      target,
      ops: ['*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

function generateIsolateLevel2(rng) {
  const vars = pickN(rng, VARS_POOL, 4);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 8);
  const c2 = randCoeff(rng, 1, 12);
  const sign = randSign(rng);
  const patterns = [
    // ax + b = c
    () => ({
      left: [c1, '*', target, sign, c2],
      right: [randCoeff(rng, 5, 30)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax + b = var
    () => ({
      left: [c1, '*', target, sign, c2],
      right: [vars[1]],
      target,
      ops: ['+', '-', '*'],
    }),
    // target + c*var2 = num
    () => ({
      left: [target, sign, randCoeff(rng, 2, 6), '*', vars[1]],
      right: [randCoeff(rng, 3, 20)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax - var2 = var3
    () => ({
      left: [c1, '*', target, '-', vars[1]],
      right: [vars[2]],
      target,
      ops: ['+', '-', '*'],
    }),
    // x / a + b = c
    () => ({
      left: [target, '/', randCoeff(rng, 2, 6), sign, vars[1]],
      right: [vars[2]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

function generateIsolateLevel3(rng) {
  const vars = pickN(rng, VARS_POOL, 5);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 9);
  const c2 = randCoeff(rng, 2, 7);
  const sign1 = randSign(rng);
  const sign2 = randSign(rng);
  const patterns = [
    // ax + by = c
    () => ({
      left: [c1, '*', target, sign1, c2, '*', vars[1]],
      right: [randCoeff(rng, 3, 20)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax + b = c + d (vars on right)
    () => ({
      left: [c1, '*', target, sign1, vars[1]],
      right: [vars[2], sign2, vars[3]],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax - by = cz
    () => ({
      left: [c1, '*', target, '-', c2, '*', vars[1]],
      right: [randCoeff(rng, 2, 6), '*', vars[2]],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax + b = c - d
    () => ({
      left: [c1, '*', target, '+', vars[1]],
      right: [vars[2], '-', randCoeff(rng, 1, 10)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax - b = c + d
    () => ({
      left: [c1, '*', target, '-', vars[1]],
      right: [vars[2], '+', vars[3]],
      target,
      ops: ['+', '-', '*'],
    }),
  ];
  return pick(rng, patterns)();
}

function generateIsolateLevel4(rng) {
  const vars = pickN(rng, VARS_POOL, 6);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 7);
  const c2 = randCoeff(rng, 1, 6);
  const sign1 = randSign(rng);
  const patterns = [
    // ax / (b + c) = d
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], sign1, c2, ')'],
      right: [vars[2]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // x / (a + b) = c - d
    () => ({
      left: [target, '/', '(', vars[1], '+', randCoeff(rng, 1, 5), ')'],
      right: [vars[2], '-', vars[3]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax / (b - c) + d = e
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '-', c2, ')', '+', vars[2]],
      right: [vars[3]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // a = bx / (c + d)  (target on right)
    () => ({
      left: [vars[1]],
      right: [c1, '*', target, '/', '(', vars[2], '+', c2, ')'],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // a = b * (c + d) / x  (target in denominator on right)
    () => ({
      left: [vars[1], sign1, vars[2]],
      right: [c1, '*', vars[3], '/', target],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax / (b + c) - d = e
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '+', randCoeff(rng, 1, 4), ')', '-', vars[2]],
      right: [vars[3]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

// ============================================================================
// MODE 2: SIMPLIFY EXPRESSION — procedural generator
// 4 difficulty levels, infinite exercises
//
// Russian math school grades 7-9:
//   Level 1: Like terms with one variable (2x+3x, 5a-2a+a)
//   Level 2: Multiple variables + constants (3x+2y-x+5+y-3)
//   Level 3: Parenthesized like factors, powers (2(a+b)+3(a+b), x²+2x²)
//   Level 4: Rational like terms, nested expressions
// ============================================================================

function generateSimplifyLevel1(rng) {
  const v = pick(rng, VARS_POOL);
  const patterns = [
    // a + b  (pure arithmetic)
    () => {
      const a = randInt(rng, 2, 15);
      const b = randInt(rng, 1, 12);
      return { expr: [String(a), '+', String(b)], expected: String(a + b) };
    },
    // a - b  (pure arithmetic, ensure positive)
    () => {
      const a = randInt(rng, 5, 20);
      const b = randInt(rng, 1, a - 1);
      return { expr: [String(a), '-', String(b)], expected: String(a - b) };
    },
    // ax + bx
    () => {
      const a = randInt(rng, 2, 8);
      const b = randInt(rng, 1, 7);
      return {
        expr: [String(a), '*', v, '+', String(b), '*', v],
        expected: [String(a + b), '*', v],
      };
    },
    // ax - bx  (ensure positive result)
    () => {
      const a = randInt(rng, 4, 10);
      const b = randInt(rng, 1, a - 1);
      return {
        expr: [String(a), '*', v, '-', String(b), '*', v],
        expected: [String(a - b), '*', v],
      };
    },
    // ax + bx + cx  (three terms)
    () => {
      const a = randInt(rng, 1, 5);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 1, 5);
      return {
        expr: [String(a), '*', v, '+', String(b), '*', v, '+', String(c), '*', v],
        expected: [String(a + b + c), '*', v],
      };
    },
    // ax + x  (implicit coefficient)
    () => {
      const a = randInt(rng, 2, 9);
      return {
        expr: [String(a), '*', v, '+', v],
        expected: [String(a + 1), '*', v],
      };
    },
    // ax + bx - cx
    () => {
      const a = randInt(rng, 3, 8);
      const b = randInt(rng, 2, 6);
      const c = randInt(rng, 1, Math.min(a + b - 1, 5));
      return {
        expr: [String(a), '*', v, '+', String(b), '*', v, '-', String(c), '*', v],
        expected: [String(a + b - c), '*', v],
      };
    },
  ];
  return pick(rng, patterns)();
}

function generateSimplifyLevel2(rng) {
  const vars2 = pickN(rng, VARS_POOL, 2);
  const [v1, v2] = vars2;
  const patterns = [
    // ax + b + cx + d  (one variable + constants)
    () => {
      const a = randInt(rng, 2, 7);
      const b = randInt(rng, 1, 10);
      const c = randInt(rng, 1, 6);
      const d = randInt(rng, 1, 10);
      return {
        expr: [String(a), '*', v1, '+', String(b), '+', String(c), '*', v1, '+', String(d)],
        expected: [String(a + c), '*', v1, '+', String(b + d)],
      };
    },
    // ax - b + cx + d
    () => {
      const a = randInt(rng, 3, 8);
      const b = randInt(rng, 1, 8);
      const c = randInt(rng, 1, 5);
      const d = randInt(rng, b + 1, 15);
      return {
        expr: [String(a), '*', v1, '-', String(b), '+', String(c), '*', v1, '+', String(d)],
        expected: [String(a + c), '*', v1, '+', String(d - b)],
      };
    },
    // ax + by + cx  (two variables)
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 1, 5);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '+', String(c), '*', v1],
        expected: [String(a + c), '*', v1, '+', String(b), '*', v2],
      };
    },
    // ax + by - cx + dy  (two variables, mixed signs)
    () => {
      const a = randInt(rng, 4, 9);
      const b = randInt(rng, 2, 6);
      const c = randInt(rng, 1, a - 1);
      const d = randInt(rng, 1, 5);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '-', String(c), '*', v1, '+', String(d), '*', v2],
        expected: [String(a - c), '*', v1, '+', String(b + d), '*', v2],
      };
    },
    // ax + by + c + dx - e  (two vars + constants)
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 3, 12);
      const d = randInt(rng, 1, 5);
      const e = randInt(rng, 1, c - 1);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '+', String(c), '+', String(d), '*', v1, '-', String(e)],
        expected: [String(a + d), '*', v1, '+', String(b), '*', v2, '+', String(c - e)],
      };
    },
    // ap + bq - cp + dq - e
    () => {
      const a = randInt(rng, 5, 10);
      const b = randInt(rng, 2, 6);
      const c = randInt(rng, 1, a - 1);
      const d = randInt(rng, 1, 4);
      const e = randInt(rng, 1, 9);
      return {
        expr: [String(a), '*', v1, '-', String(e), '+', String(b), '*', v2, '-', String(c), '*', v1, '+', String(d), '*', v2],
        expected: [String(a - c), '*', v1, '+', String(b + d), '*', v2, '-', String(e)],
      };
    },
  ];
  return pick(rng, patterns)();
}

function generateSimplifyLevel3(rng) {
  const vars2 = pickN(rng, VARS_POOL, 3);
  const [v1, v2, v3] = vars2;
  const patterns = [
    // a(x+y) + b(x+y)  (parenthesized like terms)
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', '(', v1, op, v2, ')', '+', String(b), '*', '(', v1, op, v2, ')'],
        expected: [String(a + b), '*', '(', v1, op, v2, ')'],
      };
    },
    // a(m-n) - (m-n)
    () => {
      const a = randInt(rng, 3, 8);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', '(', v1, op, v2, ')', '-', '(', v1, op, v2, ')'],
        expected: [String(a - 1), '*', '(', v1, op, v2, ')'],
      };
    },
    // a(x+y) + (x+y) + c  (parenthesized + constant)
    () => {
      const a = randInt(rng, 2, 5);
      const c = randInt(rng, 1, 10);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', '(', v1, op, v2, ')', '+', '(', v1, op, v2, ')', '+', String(c)],
        expected: [String(a + 1), '*', '(', v1, op, v2, ')', '+', String(c)],
      };
    },
    // ax² + bx²  (powers)
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const pow = pick(rng, ['x^2', 'x^3', 'a^2']);
      return {
        expr: [String(a), '*', pow, '+', String(b), '*', pow],
        expected: [String(a + b), '*', pow],
      };
    },
    // ax² + bx² - cx²  (powers with subtraction)
    () => {
      const a = randInt(rng, 3, 7);
      const b = randInt(rng, 2, 5);
      const c = randInt(rng, 1, a + b - 1);
      const pow = pick(rng, ['x^2', 'x^3', 'y^2']);
      return {
        expr: [String(a), '*', pow, '+', String(b), '*', pow, '-', String(c), '*', pow],
        expected: [String(a + b - c), '*', pow],
      };
    },
    // ax² + bx² + c  (powers + constant)
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, 10);
      const pow = pick(rng, ['x^2', 'y^2', 'a^2']);
      return {
        expr: [String(a), '*', pow, '+', String(b), '*', pow, '+', String(c)],
        expected: [String(a + b), '*', pow, '+', String(c)],
      };
    },
    // a(p+q) - b(p+q) + r
    () => {
      const a = randInt(rng, 4, 8);
      const b = randInt(rng, 1, a - 1);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', '(', v1, op, v2, ')', '-', String(b), '*', '(', v1, op, v2, ')', '+', v3],
        expected: [String(a - b), '*', '(', v1, op, v2, ')', '+', v3],
      };
    },
  ];
  return pick(rng, patterns)();
}

function generateSimplifyLevel4(rng) {
  const vars3 = pickN(rng, VARS_POOL, 4);
  const [v1, v2, v3, v4] = vars3;
  const patterns = [
    // ax/y + bx/y  (rational like terms)
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 1, 4);
      return {
        expr: [String(a), '*', v1, '/', v2, '+', String(b), '*', v1, '/', v2],
        expected: [String(a + b), '*', v1, '/', v2],
      };
    },
    // ax/b + cx/b  (rational with number denominator)
    () => {
      const a = randInt(rng, 1, 4);
      const b = randInt(rng, 1, 4);
      const d = randCoeff(rng, 2, 5);
      return {
        expr: [String(a), '*', v1, '/', d, '+', String(b), '*', v1, '/', d],
        expected: [String(a + b), '*', v1, '/', d],
      };
    },
    // a(x+1)/(y+1) + b(x+1)/(y+1)  (rational with parenthesized parts)
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 1, 4);
      const c1 = randCoeff(rng, 1, 5);
      const c2 = randCoeff(rng, 1, 5);
      const op1 = pick(rng, ['+', '-']);
      const op2 = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')', '+', String(b), '*', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')'],
        expected: [String(a + b), '*', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')'],
      };
    },
    // ax/(b+c) - dx/(b+c) + ex/(b+c)
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, a - 1);
      const c = randInt(rng, 1, 4);
      const cn = randCoeff(rng, 1, 5);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', v1, '/', '(', v2, op, cn, ')', '-', String(b), '*', v1, '/', '(', v2, op, cn, ')', '+', String(c), '*', v1, '/', '(', v2, op, cn, ')'],
        expected: [String(a - b + c), '*', v1, '/', '(', v2, op, cn, ')'],
      };
    },
    // a(m-n)/(r+s) + b(m-n)/(r+s) - (m-n)/(r+s)
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 2, 4);
      const op1 = pick(rng, ['+', '-']);
      const op2 = pick(rng, ['+', '-']);
      const c1 = randCoeff(rng, 1, 4);
      const c2 = randCoeff(rng, 1, 4);
      return {
        expr: [
          String(a), '*', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')',
          '+', String(b), '*', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')',
          '-', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')',
        ],
        expected: [String(a + b - 1), '*', '(', v1, op1, c1, ')', '/', '(', v2, op2, c2, ')'],
      };
    },
    // nested: a(p+(q+r))/b + c(p+(q+r))/b
    () => {
      const a = randInt(rng, 2, 4);
      const b = randInt(rng, 1, 3);
      const op1 = pick(rng, ['+', '-']);
      return {
        expr: [
          String(a), '*', '(', v1, op1, '(', v2, '+', v3, ')', ')',
          '+', String(b), '*', '(', v1, op1, '(', v2, '+', v3, ')', ')',
        ],
        expected: [String(a + b), '*', '(', v1, op1, '(', v2, '+', v3, ')', ')'],
      };
    },
  ];
  return pick(rng, patterns)();
}

// ============================================================================
// templateToPieces — converts a template array into pieces array
// ============================================================================

function templateToPieces(template, startSign = '+') {
  const pieces = [];
  let currentSign = startSign;
  let suppressNextSign = false;

  for (let i = 0; i < template.length; i += 1) {
    const token = template[i];

    if (token === '+' || token === '-') {
      currentSign = token;
      continue;
    }

    if (token === '*' || token === '/' || token === '^') {
      pieces.push(piece({ type: 'operator', value: token, sign: currentSign }));
      currentSign = '+';
      suppressNextSign = true;
      continue;
    }

    if (token === '(' || token === ')') {
      if (token === '(' && !suppressNextSign && (currentSign === '+' || currentSign === '-')) {
        pieces.push(piece({ type: 'number', value: 1, sign: currentSign }));
        pieces.push(piece({ type: 'operator', value: '*', sign: '+' }));
        currentSign = '+';
        suppressNextSign = true;
      }

      pieces.push(piece({ type: 'paren', value: token }));
      if (token === '(') {
        if (!suppressNextSign) suppressNextSign = true;
      } else {
        suppressNextSign = false;
      }
      continue;
    }

    const sign = suppressNextSign ? '' : currentSign;

    if (/^\d+$/.test(token)) {
      pieces.push(piece({ type: 'number', value: parseInt(token, 10), sign }));
    } else {
      // Variables may include simple power notation, e.g. x^2, x^3.
      pieces.push(piece({ type: 'variable', name: token, sign }));
    }

    currentSign = '+';
    suppressNextSign = false;
  }

  return pieces;
}

// ============================================================================
// Public API
// ============================================================================

const ISOLATE_GENERATORS = [
  generateIsolateLevel1,
  generateIsolateLevel2,
  generateIsolateLevel3,
  generateIsolateLevel4,
];

const SIMPLIFY_GENERATORS = [
  generateSimplifyLevel1,
  generateSimplifyLevel2,
  generateSimplifyLevel3,
  generateSimplifyLevel4,
];

/**
 * Generate one isolate-variable exercise for a given difficulty level (1-4).
 * Each call produces a fresh random exercise.
 */
export function generateIsolateVariable(difficultyLevel = 1, seed) {
  const rng = createRng(seed);
  const level = Math.max(1, Math.min(4, difficultyLevel));
  const generator = ISOLATE_GENERATORS[level - 1];
  const template = generator(rng);

  return {
    module: 'isolateVariable',
    expr: equation({
      left: [{ id: uid(), pieces: templateToPieces(template.left), sign: '+' }],
      right: [{ id: uid(), pieces: templateToPieces(template.right), sign: '+' }],
    }),
    targetVar: template.target,
    goal: 'isolateVar',
    hint: null,
    allowHints: true,
    difficulty: level,
    allowedOps: template.ops,
  };
}

/**
 * Generate one simplify-expression exercise for a given difficulty level (1-4).
 * Each call produces a fresh random exercise.
 */
export function generateSimplifyExpression(difficultyLevel = 1, seed) {
  const rng = createRng(seed);
  const level = Math.max(1, Math.min(4, difficultyLevel));
  const generator = SIMPLIFY_GENERATORS[level - 1];
  const template = generator(rng);

  return {
    module: 'simplifyExpression',
    simplifyDifficulty: level,
    expr: {
      type: 'expression',
      pieces: templateToPieces(template.expr),
    },
    expected: Array.isArray(template.expected)
      ? templateToPieces(template.expected)
      : template.expected,
    goal: 'simplify',
    hint: null,
    allowHints: true,
    difficulty: level,
  };
}

/**
 * Generate a single exercise on the fly.
 * Called by ExerciseScreen whenever the next exercise is needed.
 */
export function generateNextExercise(moduleId, difficultyLevel = 1) {
  if (moduleId === 'isolateVariable') {
    return generateIsolateVariable(difficultyLevel);
  }
  if (moduleId === 'simplifyExpression') {
    return generateSimplifyExpression(difficultyLevel);
  }
  return null;
}
