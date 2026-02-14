import { term, equation, fraction, uid } from './expressionModel';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- MODULE 1: Move additive terms across = ----
// Generates equations like 2b - a = c  (Find b → b = (a+c)/2)
// Uses letter variables and requires two steps: move additive, then divide.
export function generateMoveAdditive() {
  const allVars = ['a', 'b', 'c', 'd', 'k', 'm', 'n', 'p', 'x', 'y'];
  // Pick 3 different variables
  const shuffled = [...allVars].sort(() => Math.random() - 0.5);
  const targetVar = shuffled[0];
  const otherVar = shuffled[1];
  const rightVar = shuffled[2];

  const coeff = randInt(2, 6); // always > 1 so step 2 (divide) is needed
  const sign = Math.random() > 0.5 ? '+' : '-';

  // coeff*targetVar ± otherVar = rightVar
  return {
    module: 'moveAdditive',
    expr: equation({
      left: [
        term({ coeff, vars: [targetVar], sign: '+' }),
        term({ coeff: 1, vars: [otherVar], sign }),
      ],
      right: [term({ coeff: 1, vars: [rightVar], sign: '+' })],
    }),
    targetVar,
    goal: 'isolateVar',
    hint: null,
  };
}

// ---- MODULE 2: Move multiplicative terms across = ----
export function generateMoveMultiplicative() {
  const varName = pick(['x', 'y', 'a', 'b']);
  const multiplier = randInt(2, 9);
  const rightVal = multiplier * randInt(1, 12);

  return {
    module: 'moveMultiplicative',
    expr: equation({
      left: [term({ coeff: multiplier, vars: [varName], sign: '+' })],
      right: [term({ coeff: rightVal, vars: [], sign: '+' })],
    }),
    goal: 'isolateVar',
    hint: 'Перетащи коэффициент. Куда он должен попасть — в числитель или знаменатель?',
  };
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// ---- MODULE 3: Simplify fractions ----
export function generateSimplify() {
  const varName = pick(['x', 'y', 'a', 'b']);
  const common = randInt(2, 6);
  const numMult = randInt(1, 5);
  const denMult = randInt(1, 5);
  const numCoeff = common * numMult;
  // Ensure num and den are different
  let denCoeff = common * denMult;
  if (denCoeff === numCoeff) denCoeff += common;

  // Pre-compute the fully simplified target
  const g = gcd(numCoeff, denCoeff);
  const targetNum = numCoeff / g;
  const targetDen = denCoeff / g;

  return {
    module: 'simplify',
    expr: fraction({
      num: [term({ coeff: numCoeff, vars: [varName], sign: '+' })],
      den: [term({ coeff: denCoeff, vars: [], sign: '+' })],
    }),
    goal: 'simplify',
    commonFactor: common,
    target: { numCoeff: targetNum, denCoeff: targetDen, varName },
    hint: null, // No hint -- user must figure it out
  };
}

// ---- MODULE 4: Cross multiplication ----
export function generateCrossMultiply() {
  const vars = ['a', 'b', 'c', 'd'];
  const coeffs = vars.map(() => randInt(1, 9));

  return {
    module: 'crossMultiply',
    expr: equation({
      left: [
        fraction({
          num: [term({ coeff: coeffs[0], vars: [vars[0]], sign: '+' })],
          den: [term({ coeff: coeffs[1], vars: [vars[1]], sign: '+' })],
        }),
      ],
      right: [
        fraction({
          num: [term({ coeff: coeffs[2], vars: [vars[2]], sign: '+' })],
          den: [term({ coeff: coeffs[3], vars: [vars[3]], sign: '+' })],
        }),
      ],
    }),
    goal: 'crossMultiply',
    hint: 'Перемножь крест-накрест: числитель первой × знаменатель второй',
  };
}

// ---- MODULE 5: Combine fractions ----
export function generateCombineFractions() {
  const v1 = pick(['a', 'b', 'x', 'y']);
  let v2 = pick(['a', 'b', 'x', 'y']);
  while (v2 === v1) v2 = pick(['a', 'b', 'x', 'y']);
  const c1 = randInt(1, 5);
  const c2 = randInt(1, 5);

  return {
    module: 'combineFractions',
    expr: {
      type: 'sum_of_fractions',
      fractions: [
        fraction({
          num: [term({ coeff: c1, vars: [], sign: '+' })],
          den: [term({ coeff: 1, vars: [v1], sign: '+' })],
        }),
        fraction({
          num: [term({ coeff: c2, vars: [], sign: '+' })],
          den: [term({ coeff: 1, vars: [v2], sign: '+' })],
        }),
      ],
      operator: '+',
    },
    goal: 'combine',
    hint: `Общий знаменатель: ${v1}·${v2}`,
  };
}

const generators = {
  moveAdditive: generateMoveAdditive,
  moveMultiplicative: generateMoveMultiplicative,
  simplify: generateSimplify,
  crossMultiply: generateCrossMultiply,
  combineFractions: generateCombineFractions,
};

export function generateExercise(moduleId) {
  const gen = generators[moduleId];
  if (!gen) throw new Error(`Unknown module: ${moduleId}`);
  return gen();
}

export function generateExerciseSet(moduleId, count = 8) {
  return Array.from({ length: count }, () => generateExercise(moduleId));
}
