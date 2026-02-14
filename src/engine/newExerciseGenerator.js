import { piece, equation, uid } from './expressionModel';

// ============================================================================
// MODE 1: ISOLATE VARIABLE - 30 progressive samples
// ============================================================================

const MODE1_EXERCISES = [
  // Level 1: One rule per step (1-5)
  { left: ['2', '*', 'x'], right: ['8'], target: 'x', ops: ['*'] },
  { left: ['y', '+', '5'], right: ['12'], target: 'y', ops: ['+', '-'] },
  { left: ['z', '-', '4'], right: ['9'], target: 'z', ops: ['+', '-'] },
  { left: ['3', '*', 'a'], right: ['b'], target: 'a', ops: ['*'] },
  { left: ['p', '/', '5'], right: ['q'], target: 'p', ops: ['*', '/'] },

  // Level 2: Two-step isolation (6-10)
  { left: ['3', '*', 'x', '+', '2'], right: ['11'], target: 'x', ops: ['+', '-', '*'] },
  { left: ['4', '*', 'y', '-', '7'], right: ['k'], target: 'y', ops: ['+', '-', '*'] },
  { left: ['m', '+', '2', '*', 'n'], right: ['9'], target: 'm', ops: ['+', '-', '*'] },
  { left: ['5', '*', 'a', '-', 'b'], right: ['c'], target: 'a', ops: ['+', '-', '*'] },
  { left: ['r', '/', '3', '+', 's'], right: ['t'], target: 'r', ops: ['+', '-', '*', '/'] },

  // Level 3: Term blocks before factor blocks (11-15)
  { left: ['5', '*', 'm', '-', '2', '*', 'n'], right: ['7'], target: 'm', ops: ['+', '-', '*'] },
  { left: ['6', '*', 'p', '+', 'q'], right: ['3', '*', 'r'], target: 'p', ops: ['+', '-', '*'] },
  { left: ['4', '*', 'a', '-', 'b'], right: ['c', '+', 'd'], target: 'a', ops: ['+', '-', '*'] },
  { left: ['2', '*', 'x', '+', 'y'], right: ['z', '-', '3'], target: 'x', ops: ['+', '-', '*'] },
  { left: ['7', '*', 'k', '-', 'u'], right: ['v', '+', 'w'], target: 'k', ops: ['+', '-', '*'] },

  // Level 4: Fraction factors and parenthesized blocks (16-20)
  { left: ['2', '*', 'a', '/', '(', 'b', '+', '3', ')'], right: ['c'], target: 'a', ops: ['+', '-', '*', '/'] },
  { left: ['3', '*', 'm', '/', '(', 'n', '-', '1', ')'], right: ['p', '+', 'q'], target: 'm', ops: ['+', '-', '*', '/'] },
  { left: ['x', '/', '(', 'k', '+', '2', ')'], right: ['r', '-', 's'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['5', '*', 'y', '/', '(', 't', '-', '4', ')', '+', 'u'], right: ['v'], target: 'y', ops: ['+', '-', '*', '/'] },
  { left: ['4', '*', 'z', '/', '(', 'p', '+', '1', ')', '-', 'q'], right: ['r'], target: 'z', ops: ['+', '-', '*', '/'] },

  // Level 5: Move target factors across sides (21-25)
  { left: ['p'], right: ['2', '*', '(', 'q', '+', '1', ')', '/', 'x'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['s', '-', 'u'], right: ['t', '/', 'x'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['r'], right: ['x', '/', '(', 'm', '+', '2', ')'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['c', '+', 'd'], right: ['5', '*', 'a', '/', '(', 'b', '-', '1', ')'], target: 'a', ops: ['+', '-', '*', '/'] },
  { left: ['7', '*', 'k', '/', '(', 'm', '+', '1', ')'], right: ['n', '-', 'p'], target: 'k', ops: ['+', '-', '*', '/'] },

  // Level 6: Mixed advanced sequences (26-30)
  { left: ['2', '*', 'x', '/', '(', 'a', '+', '1', ')', '+', 'b'], right: ['c'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['d'], right: ['x', '/', '(', 'y', '-', '2', ')', '+', 'z'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['p', '-', 'q'], right: ['2', '*', 'r', '/', 'x'], target: 'x', ops: ['+', '-', '*', '/'] },
  { left: ['u'], right: ['3', '*', 'v', '/', '(', 'x', '-', '4', ')'], target: 'v', ops: ['+', '-', '*', '/'] },
  { left: ['w', '+', 't'], right: ['2', '*', 'a', '/', '(', 'c', '+', '6', ')'], target: 'a', ops: ['+', '-', '*', '/'] },
];

// ============================================================================
// MODE 2: SIMPLIFY EXPRESSION
// ============================================================================

const MODE2_NORMAL_EXERCISES = [
  // Level 1: arithmetic and like-terms warmup
  { expr: ['2', '+', '3'], expected: '5' },
  { expr: ['9', '-', '4'], expected: '5' },
  { expr: ['6', '+', '1'], expected: '7' },
  { expr: ['2', '*', 'x', '+', '3', '*', 'x'], expected: ['5', '*', 'x'] },
  { expr: ['5', '*', 'a', '-', '2', '*', 'a'], expected: ['3', '*', 'a'] },

  // Level 2: several merges
  { expr: ['4', '*', 'y', '+', 'y'], expected: ['5', '*', 'y'] },
  { expr: ['6', '*', 'x', '+', '4', '*', 'x', '-', '2', '*', 'x'], expected: ['8', '*', 'x'] },
  { expr: ['3', '*', 'x', '+', '2', '*', 'y', '+', '4', '*', 'x'], expected: ['7', '*', 'x', '+', '2', '*', 'y'] },
  { expr: ['5', '*', 'a', '-', '2', '*', 'b', '+', '3', '*', 'a'], expected: ['8', '*', 'a', '-', '2', '*', 'b'] },
  { expr: ['7', '*', 'p', '+', '3', '*', 'q', '-', '4', '*', 'p', '+', '2', '*', 'q'], expected: ['3', '*', 'p', '+', '5', '*', 'q'] },

  // Level 3: constants + multiple variables
  { expr: ['2', '*', 'x', '+', '5', '+', '3', '*', 'x', '+', '7'], expected: ['5', '*', 'x', '+', '12'] },
  { expr: ['4', '*', 'a', '-', '3', '+', '2', '*', 'a', '+', '8'], expected: ['6', '*', 'a', '+', '5'] },
  { expr: ['5', '*', 'y', '+', '9', '-', '2', '*', 'y', '-', '4'], expected: ['3', '*', 'y', '+', '5'] },
  { expr: ['3', '*', 'x', '+', '6', '*', 'y', '+', '2', '+', '4', '*', 'x', '-', '5'], expected: ['7', '*', 'x', '+', '6', '*', 'y', '-', '3'] },
  { expr: ['7', '*', 'p', '-', '8', '+', '3', '*', 'q', '+', '2', '*', 'p', '+', '5'], expected: ['9', '*', 'p', '+', '3', '*', 'q', '-', '3'] },

  // Level 4: parenthesized like factors
  { expr: ['2', '*', '(', 'a', '+', 'b', ')', '+', '3', '*', '(', 'a', '+', 'b', ')'], expected: ['5', '*', '(', 'a', '+', 'b', ')'] },
  { expr: ['3', '*', '(', 'm', '-', '1', ')', '-', '(', 'm', '-', '1', ')'], expected: ['2', '*', '(', 'm', '-', '1', ')'] },
  { expr: ['2', '*', '(', 'x', '+', 'y', ')', '+', '(', 'x', '+', 'y', ')', '+', '4'], expected: ['3', '*', '(', 'x', '+', 'y', ')', '+', '4'] },
  { expr: ['4', '*', '(', 'p', '+', 'q', ')', '-', '2', '*', '(', 'p', '+', 'q', ')', '+', 'r'], expected: ['2', '*', '(', 'p', '+', 'q', ')', '+', 'r'] },
  { expr: ['5', '*', '(', 'u', '-', 'v', ')', '+', '2', '*', '(', 'u', '-', 'v', ')', '-', '3'], expected: ['7', '*', '(', 'u', '-', 'v', ')', '-', '3'] },

  // Level 5: mixed-sign larger forms
  { expr: ['2', '*', 'x', '-', '3', '+', '5', '*', 'x', '-', '7', '+', 'x'], expected: ['8', '*', 'x', '-', '10'] },
  { expr: ['9', '*', 'a', '+', '2', '*', 'b', '-', '4', '*', 'a', '+', 'b', '-', '6'], expected: ['5', '*', 'a', '+', '3', '*', 'b', '-', '6'] },
  { expr: ['6', '*', 'y', '+', '2', '*', 'x', '+', '3', '*', 'y', '-', 'x', '+', '4'], expected: ['x', '+', '9', '*', 'y', '+', '4'] },
  { expr: ['8', '*', 'm', '-', '5', '+', '2', '*', 'n', '+', '3', '*', 'm', '+', 'n'], expected: ['11', '*', 'm', '+', '3', '*', 'n', '-', '5'] },
  { expr: ['4', '*', 'p', '+', '7', '-', '2', '*', 'q', '+', '5', '*', 'p', '-', '3', '*', 'q'], expected: ['9', '*', 'p', '-', '5', '*', 'q', '+', '7'] },

  // Level 6: pre-hard bridge with simple rational like terms
  { expr: ['x', '/', '2', '+', '3', '*', 'x', '/', '2'], expected: ['2', '*', 'x'] },
  { expr: ['2', '*', 'x', '/', 'y', '+', 'x', '/', 'y'], expected: ['3', '*', 'x', '/', 'y'] },
  { expr: ['3', '*', '(', 'a', '+', '1', ')', '/', 'b', '+', '2', '*', '(', 'a', '+', '1', ')', '/', 'b'], expected: ['5', '*', '(', 'a', '+', '1', ')', '/', 'b'] },
  { expr: ['2', '*', 'r', '/', '(', 's', '+', '1', ')', '-', 'r', '/', '(', 's', '+', '1', ')'], expected: ['r', '/', '(', 's', '+', '1', ')'] },
  { expr: ['4', '*', 'x', '/', '(', 'y', '+', '2', ')', '+', 'x', '/', '(', 'y', '+', '2', ')', '+', '3'], expected: ['5', '*', 'x', '/', '(', 'y', '+', '2', ')', '+', '3'] },
];

const MODE2_HARD_EXERCISES = [
  // Level 1: powers with multiple merges
  { expr: ['x^2', '+', '2', '*', 'x^2', '-', 'x^2', '+', '3', '*', 'x^2'], expected: ['5', '*', 'x^2'] },
  { expr: ['3', '*', 'x^3', '-', 'x^3', '+', '2', '*', 'x^3', '-', 'x^3'], expected: ['3', '*', 'x^3'] },
  { expr: ['2', '*', 'x^2', '+', 'x^2', '+', '4', '*', 'x^2', '-', '3', '*', 'x^2'], expected: ['4', '*', 'x^2'] },
  { expr: ['5', '*', 'x^3', '-', '2', '*', 'x^3', '+', 'x^3', '-', 'x^3'], expected: ['3', '*', 'x^3'] },
  { expr: ['2', '*', 'x^2', '+', '3', '*', 'x^2', '+', 'x^2', '-', '4', '*', 'x^2', '+', '6'], expected: ['2', '*', 'x^2', '+', '6'] },

  // Level 2: nested-parenthesized terms with several merges
  { expr: ['2', '*', '(', 'a', '+', '(', 'b', '+', 'c', ')', ')', '+', '3', '*', '(', 'a', '+', '(', 'b', '+', 'c', ')', ')', '-', '(', 'a', '+', '(', 'b', '+', 'c', ')', ')'], expected: ['4', '*', '(', 'a', '+', '(', 'b', '+', 'c', ')', ')'] },
  { expr: ['4', '*', '(', 'm', '-', '(', 'n', '-', '1', ')', ')', '-', '(', 'm', '-', '(', 'n', '-', '1', ')', ')', '+', '2', '*', '(', 'm', '-', '(', 'n', '-', '1', ')', ')'], expected: ['5', '*', '(', 'm', '-', '(', 'n', '-', '1', ')', ')'] },
  { expr: ['3', '*', '(', 'p', '+', '(', 'q', '+', 'r', ')', ')', '+', '2', '*', '(', 'p', '+', '(', 'q', '+', 'r', ')', ')', '-', '(', 'p', '+', '(', 'q', '+', 'r', ')', ')', '+', '(', 'p', '+', '(', 'q', '+', 'r', ')', ')'], expected: ['5', '*', '(', 'p', '+', '(', 'q', '+', 'r', ')', ')'] },
  { expr: ['2', '*', '(', 'x', '+', '1', ')', '*', 'y', '+', '3', '*', '(', 'x', '+', '1', ')', '*', 'y', '-', '(', 'x', '+', '1', ')', '*', 'y'], expected: ['4', '*', '(', 'x', '+', '1', ')', '*', 'y'] },
  { expr: ['5', '*', '(', 'u', '-', '(', 'v', '+', '1', ')', ')', '-', '2', '*', '(', 'u', '-', '(', 'v', '+', '1', ')', ')', '+', '(', 'u', '-', '(', 'v', '+', '1', ')', ')'], expected: ['4', '*', '(', 'u', '-', '(', 'v', '+', '1', ')', ')'] },

  // Level 3: rational terms with deeper combine chains
  { expr: ['x', '/', '2', '+', '3', '*', 'x', '/', '2', '-', 'x', '/', '2', '+', '2', '*', 'x', '/', '2'], expected: ['5', '*', 'x', '/', '2'] },
  { expr: ['2', '*', 'x', '/', 'y', '-', 'x', '/', 'y', '+', '4', '*', 'x', '/', 'y', '-', 'x', '/', 'y'], expected: ['4', '*', 'x', '/', 'y'] },
  { expr: ['3', '*', 'x', '/', '(', '2', '*', 'y', ')', '+', 'x', '/', '(', '2', '*', 'y', ')', '+', '2', '*', 'x', '/', '(', '2', '*', 'y', ')'], expected: ['3', '*', 'x', '/', 'y'] },
  { expr: ['2', '*', '(', 'x', '+', '1', ')', '/', '(', 'y', '+', '1', ')', '+', '3', '*', '(', 'x', '+', '1', ')', '/', '(', 'y', '+', '1', ')', '-', '(', 'x', '+', '1', ')', '/', '(', 'y', '+', '1', ')'], expected: ['4', '*', '(', 'x', '+', '1', ')', '/', '(', 'y', '+', '1', ')'] },
  { expr: ['4', '*', '(', 'a', '-', 'b', ')', '/', '(', 'c', '+', 'd', ')', '-', '(', 'a', '-', 'b', ')', '/', '(', 'c', '+', 'd', ')', '+', '2', '*', '(', 'a', '-', 'b', ')', '/', '(', 'c', '+', 'd', ')'], expected: ['5', '*', '(', 'a', '-', 'b', ')', '/', '(', 'c', '+', 'd', ')'] },

  // Level 4: rational + powers with many operations
  { expr: ['x^2', '/', 'x', '+', '2', '*', 'x', '+', 'x^2', '/', 'x', '-', 'x'], expected: ['3', '*', 'x'] },
  { expr: ['x^3', '/', 'x', '+', 'x^2', '+', '2', '*', 'x^2', '-', 'x^2'], expected: ['3', '*', 'x^2'] },
  { expr: ['2', '*', 'x^2', '/', 'y', '+', 'x^2', '/', 'y', '-', 'x^2', '/', 'y', '+', '3', '*', 'x^2', '/', 'y'], expected: ['5', '*', 'x^2', '/', 'y'] },
  { expr: ['3', '*', 'x^3', '/', '(', 'z', '+', '1', ')', '+', '2', '*', 'x^3', '/', '(', 'z', '+', '1', ')', '-', 'x^3', '/', '(', 'z', '+', '1', ')'], expected: ['4', '*', 'x^3', '/', '(', 'z', '+', '1', ')'] },
  { expr: ['2', '*', 'x', '*', 'x', '/', 'x', '+', 'x', '+', '3', '*', 'x^2', '/', 'x', '-', 'x'], expected: ['5', '*', 'x'] },

  // Level 5: full rational expressions as like terms (multi-step)
  { expr: ['(', 'x', '+', '1', ')', '/', '(', 'a', '+', 'b', ')', '+', '2', '*', '(', 'x', '+', '1', ')', '/', '(', 'a', '+', 'b', ')', '+', '3', '*', '(', 'x', '+', '1', ')', '/', '(', 'a', '+', 'b', ')'], expected: ['6', '*', '(', 'x', '+', '1', ')', '/', '(', 'a', '+', 'b', ')'] },
  { expr: ['3', '*', '(', 'm', '-', '2', ')', '/', '(', 'n', '-', '1', ')', '-', '(', 'm', '-', '2', ')', '/', '(', 'n', '-', '1', ')', '+', '2', '*', '(', 'm', '-', '2', ')', '/', '(', 'n', '-', '1', ')'], expected: ['4', '*', '(', 'm', '-', '2', ')', '/', '(', 'n', '-', '1', ')'] },
  { expr: ['2', '*', '(', 'p', '+', 'q', ')', '/', '(', 'r', '+', 's', ')', '+', '3', '*', '(', 'p', '+', 'q', ')', '/', '(', 'r', '+', 's', ')', '-', '(', 'p', '+', 'q', ')', '/', '(', 'r', '+', 's', ')', '+', '2', '*', '(', 'p', '+', 'q', ')', '/', '(', 'r', '+', 's', ')'], expected: ['6', '*', '(', 'p', '+', 'q', ')', '/', '(', 'r', '+', 's', ')'] },
  { expr: ['(', 'u', '+', '1', ')', '/', '(', 'v', '+', '1', ')', '+', '(', 'u', '+', '1', ')', '/', '(', 'v', '+', '1', ')', '+', '(', 'u', '+', '1', ')', '/', '(', 'v', '+', '1', ')', '-', '(', 'u', '+', '1', ')', '/', '(', 'v', '+', '1', ')'], expected: ['2', '*', '(', 'u', '+', '1', ')', '/', '(', 'v', '+', '1', ')'] },
  { expr: ['5', '*', '(', 'k', '-', '1', ')', '/', '(', 't', '+', '2', ')', '-', '2', '*', '(', 'k', '-', '1', ')', '/', '(', 't', '+', '2', ')', '+', '4', '*', '(', 'k', '-', '1', ')', '/', '(', 't', '+', '2', ')'], expected: ['7', '*', '(', 'k', '-', '1', ')', '/', '(', 't', '+', '2', ')'] },

  // Level 6: final long chains (many mandatory merges)
  { expr: ['x', '/', '2', '+', '3', '*', 'x', '/', '2', '-', 'x', '/', '2', '+', 'x', '+', '2', '*', 'x', '/', '2'], expected: ['4', '*', 'x'] },
  { expr: ['2', '*', 'x^2', '/', '(', 'y', '+', '1', ')', '+', 'x^2', '/', '(', 'y', '+', '1', ')', '+', '3', '*', 'x^2', '/', '(', 'y', '+', '1', ')', '-', 'x^2', '/', '(', 'y', '+', '1', ')'], expected: ['5', '*', 'x^2', '/', '(', 'y', '+', '1', ')'] },
  { expr: ['3', '*', '(', 'a', '+', 'b', ')', '/', 'c', '+', '2', '*', '(', 'a', '+', 'b', ')', '/', 'c', '-', '(', 'a', '+', 'b', ')', '/', 'c', '+', '4', '+', '5', '-', '2'], expected: ['4', '*', '(', 'a', '+', 'b', ')', '/', 'c', '+', '7'] },
  { expr: ['x^2', '*', 'x', '+', '2', '*', 'x^3', '-', 'x', '*', 'x^2', '+', '4', '*', 'x^3', '-', '2', '*', 'x^3'], expected: ['4', '*', 'x^3'] },
  { expr: ['2', '*', '(', 'm', '+', '1', ')', '/', '(', 'n', '+', '1', ')', '+', '3', '*', '(', 'm', '+', '1', ')', '/', '(', 'n', '+', '1', ')', '+', '4', '*', '(', 'm', '+', '1', ')', '/', '(', 'n', '+', '1', ')', '-', '2', '*', '(', 'm', '+', '1', ')', '/', '(', 'n', '+', '1', ')'], expected: ['7', '*', '(', 'm', '+', '1', ')', '/', '(', 'n', '+', '1', ')'] },
];

// ============================================================================
// Generator Functions
// ============================================================================

/**
 * Converts a template array into pieces array
 * ['2', '*', 'x', '+', '3'] -> number(2), operator(*), variable(x), number(3)
 */
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

/**
 * Generate a specific isolate variable exercise by index (0-29)
 */
export function generateIsolateVariable(index) {
  const template = MODE1_EXERCISES[index % MODE1_EXERCISES.length];

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
    difficulty: Math.floor(index / 5) + 1, // 1-6
    allowedOps: template.ops,
  };
}

/**
 * Generate a specific simplify exercise by index (0-29)
 */
export function generateSimplifyExpression(index, difficulty = 'normal') {
  const templates = difficulty === 'hard' ? MODE2_HARD_EXERCISES : MODE2_NORMAL_EXERCISES;
  const template = templates[index % templates.length];

  return {
    module: 'simplifyExpression',
    simplifyDifficulty: difficulty,
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
    difficulty: Math.floor(index / 5) + 1, // 1-6
  };
}

/**
 * Generate a set of exercises for a module
 */
export function generateExerciseSet(moduleId, count = 30, options = {}) {
  const exercises = [];
  const simplifyDifficulty = options.simplifyDifficulty || 'normal';

  for (let i = 0; i < count; i += 1) {
    if (moduleId === 'isolateVariable') {
      exercises.push(generateIsolateVariable(i));
    } else if (moduleId === 'simplifyExpression') {
      exercises.push(generateSimplifyExpression(i, simplifyDifficulty));
    }
  }

  return exercises;
}
