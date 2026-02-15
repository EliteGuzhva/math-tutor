import { piece, equation, uid } from './expressionModel';

// ============================================================================
// Utility: pseudo-random number generator
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
// Difficulty = number of drag steps required to isolate the target variable.
//
// Step types in this UI:
//   - moveAdditive: drag a non-target term across "=" (sign flips)
//   - moveMultiplicative: drag the target's coefficient to denominator
//   - fraction ops: multiply both sides by a parenthesized denominator
//
// Level 1 (Easy):     ~2 steps   — one additive move + one division
// Level 2 (Medium):   ~3-4 steps — multiple additive moves + division, or fraction ops
// Level 3 (Hard):     ~5-6 steps — many terms on both sides + fractions
// Level 4 (Olympiad): ~7+ steps  — many terms + nested fractions + mixed operations
// ============================================================================

// ---------------------------------------------------------------------------
// Level 1: ~2 steps (1 additive + 1 multiplicative, or 2 additive)
// ---------------------------------------------------------------------------
function generateIsolateLevel1(rng) {
  const vars = pickN(rng, VARS_POOL, 4);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 8);
  const c2 = randCoeff(rng, 1, 12);
  const sign = randSign(rng);
  const patterns = [
    // ax + b = c  →  move b (1), divide by a (2) = 2 steps
    () => ({
      left: [c1, '*', target, sign, c2],
      right: [randCoeff(rng, 5, 30)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax + b = var  →  move b (1), divide by a (2) = 2 steps
    () => ({
      left: [c1, '*', target, sign, c2],
      right: [vars[1]],
      target,
      ops: ['+', '-', '*'],
    }),
    // target + c*var2 = num  →  move c*var2 (1), done or divide (2) = 2 steps
    () => ({
      left: [target, sign, randCoeff(rng, 2, 6), '*', vars[1]],
      right: [randCoeff(rng, 3, 20)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax - var2 = var3  →  move var2 (1), divide by a (2) = 2 steps
    () => ({
      left: [c1, '*', target, '-', vars[1]],
      right: [vars[2]],
      target,
      ops: ['+', '-', '*'],
    }),
    // x/a + b = c  →  move b (1), multiply by a (2) = 2 steps
    () => ({
      left: [target, '/', randCoeff(rng, 2, 6), sign, vars[1]],
      right: [vars[2]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

// ---------------------------------------------------------------------------
// Level 2: ~3-4 steps (2-3 additive moves + division, or fraction ops)
// ---------------------------------------------------------------------------
function generateIsolateLevel2(rng) {
  const vars = pickN(rng, VARS_POOL, 6);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 9);
  const s1 = randSign(rng);
  const s2 = randSign(rng);
  const patterns = [
    // ax + b + c = d  →  move b (1), move c (2), divide a (3) = 3 steps
    () => ({
      left: [c1, '*', target, s1, randCoeff(rng, 1, 8), s2, vars[1]],
      right: [randCoeff(rng, 5, 20)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax + b = c + d  →  move b (1), divide a (2) = 2-3 steps
    () => ({
      left: [c1, '*', target, s1, vars[1]],
      right: [vars[2], s2, vars[3]],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax - by = cz  →  move by (1), divide a (2) = 2 steps, but with compound right
    () => ({
      left: [c1, '*', target, '-', randCoeff(rng, 2, 7), '*', vars[1]],
      right: [randCoeff(rng, 2, 6), '*', vars[2]],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax/(b+c) = d  →  multiply by (b+c) (1), divide by a (2) = 2-3 steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], s1, randCoeff(rng, 1, 6), ')'],
      right: [vars[2]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // x/(a+b) = c - d  →  multiply by (a+b) (1) = 1-2 steps
    () => ({
      left: [target, '/', '(', vars[1], '+', randCoeff(rng, 1, 5), ')'],
      right: [vars[2], '-', vars[3]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax/(b-c) + d = e  →  move d (1), multiply by (b-c) (2), divide a (3) = 3 steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '-', randCoeff(rng, 1, 6), ')', '+', vars[2]],
      right: [vars[3]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // a = bx/(c+d)  →  multiply by (c+d) (1), divide by b (2), swap (3) = 3 steps
    () => ({
      left: [vars[1]],
      right: [c1, '*', target, '/', '(', vars[2], '+', randCoeff(rng, 1, 5), ')'],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // a+b = c*d/x  →  multiply by x (1), divide by (a+b) (2) = 3 steps
    () => ({
      left: [vars[1], s1, vars[2]],
      right: [c1, '*', vars[3], '/', target],
      target,
      ops: ['+', '-', '*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

// ---------------------------------------------------------------------------
// Level 3: ~5-6 steps — many terms on both sides, fractions with extra terms
// Russian school grade 8-9: physics formulas, compound equations
// ---------------------------------------------------------------------------
function generateIsolateLevel3(rng) {
  const vars = pickN(rng, VARS_POOL, 8);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 7);
  const c2 = randCoeff(rng, 2, 6);
  const s1 = randSign(rng);
  const s2 = randSign(rng);
  const s3 = randSign(rng);
  const patterns = [
    // ax + b + c + d = e + f  →  move b (1), c (2), d (3), divide a (4) = 4-5 steps
    () => ({
      left: [c1, '*', target, s1, vars[1], s2, randCoeff(rng, 1, 9), s3, vars[2]],
      right: [vars[3], '+', vars[4]],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax + by + c = dz + e + f  →  move by (1), c (2), dz (3?), move e/f, divide a = 5 steps
    () => ({
      left: [c1, '*', target, '+', c2, '*', vars[1], s1, randCoeff(rng, 1, 8)],
      right: [randCoeff(rng, 2, 5), '*', vars[2], s2, vars[3], s3, randCoeff(rng, 1, 7)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax/(b+c) + d + e = f + g  →  move d (1), e (2), multiply (b+c) (3), divide a (4) = 5 steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '+', randCoeff(rng, 1, 4), ')', s1, vars[2], s2, vars[3]],
      right: [vars[4], s3, vars[5]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax/(b+c) + d = e/(f+g)  →  move d (1), cross multiply or handle fractions (2-3), divide (4-5) = 5 steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '+', randCoeff(rng, 1, 5), ')', s1, vars[2]],
      right: [c2, '*', vars[3], '/', '(', vars[4], '-', randCoeff(rng, 1, 4), ')'],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // p + q = ax/(b+c) + d + e  →  target on right, move d (1), e (2), multiply (b+c) (3), divide a (4) = 5-6 steps
    () => ({
      left: [vars[1], s1, vars[2], s2, randCoeff(rng, 1, 9)],
      right: [c1, '*', target, '/', '(', vars[3], '+', randCoeff(rng, 1, 5), ')', s3, vars[4], '+', vars[5]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax + by + cz + d = e  →  move by (1), cz (2), d (3), divide a (4) = 4-5 steps
    () => ({
      left: [c1, '*', target, '+', c2, '*', vars[1], s1, randCoeff(rng, 2, 5), '*', vars[2], s2, randCoeff(rng, 1, 8)],
      right: [vars[3]],
      target,
      ops: ['+', '-', '*'],
    }),
    // a + b + c = dx/(e+f) + g  →  move a,b,c to right (or g to left), multiply, divide = 5-6 steps
    () => ({
      left: [vars[1], s1, vars[2], s2, randCoeff(rng, 1, 7)],
      right: [c1, '*', target, '/', '(', vars[3], s3, randCoeff(rng, 1, 4), ')', '+', vars[4]],
      target,
      ops: ['+', '-', '*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

// ---------------------------------------------------------------------------
// Level 4: ~7+ steps — compound fractions, many terms, deeply nested structures
// Russian olympiad / advanced grade 9 level
// ---------------------------------------------------------------------------
function generateIsolateLevel4(rng) {
  const vars = pickN(rng, VARS_POOL, 10);
  const target = vars[0];
  const c1 = randCoeff(rng, 2, 7);
  const c2 = randCoeff(rng, 2, 6);
  const c3 = randCoeff(rng, 2, 5);
  const s1 = randSign(rng);
  const s2 = randSign(rng);
  const s3 = randSign(rng);
  const s4 = randSign(rng);
  const patterns = [
    // ax + by + cz + d + e = fv + gw + h
    // move by(1), cz(2), d(3), e(4), fv(5?), gw(5?), divide a(6) = 6-7 steps
    () => ({
      left: [c1, '*', target, '+', c2, '*', vars[1], s1, c3, '*', vars[2], s2, randCoeff(rng, 1, 9), s3, vars[3]],
      right: [randCoeff(rng, 2, 6), '*', vars[4], s4, randCoeff(rng, 2, 5), '*', vars[5], '+', randCoeff(rng, 1, 8)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax/(b+c) + dy + e + f = gz + h + k
    // move dy(1), e(2), f(3), multiply(b+c)(4), divide a(5), plus manage right side = 7 steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], s1, randCoeff(rng, 1, 5), ')', '+', c2, '*', vars[2], s2, vars[3], s3, randCoeff(rng, 1, 6)],
      right: [c3, '*', vars[4], s4, vars[5], '+', randCoeff(rng, 1, 7)],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // p + q + r + s = ax/(b+c) + d + e + f
    // move d(1), e(2), f(3) to left or p,q,r,s minus target side, multiply(b+c)(4), divide a(5) = 7+ steps
    () => ({
      left: [vars[1], s1, vars[2], s2, vars[3], s3, randCoeff(rng, 1, 8)],
      right: [c1, '*', target, '/', '(', vars[4], '+', randCoeff(rng, 1, 4), ')', s4, vars[5], '+', vars[6], '-', randCoeff(rng, 1, 5)],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax/(b+c) + dy/(e+f) + g = h + k  (two fraction groups, target in first)
    // move dy/(e+f)(1), g(2), multiply(b+c)(3), divide a(4) + handle right side = 7 steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '+', randCoeff(rng, 1, 4), ')', '+', c2, '*', vars[2], '/', '(', vars[3], '-', randCoeff(rng, 1, 3), ')', s1, vars[4]],
      right: [vars[5], s2, vars[6], s3, randCoeff(rng, 1, 9)],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // ax/(b+c) + d + e + f = gx/(h+k) + m  — but NOT x on both sides (different target)
    // Instead: compound fraction: ax / (b + c/(d+e)) + f = g
    // move f(1), multiply(b+c/(d+e))(2-3 sub-steps), divide a(4) = 7+ steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], '+', vars[2], '/', '(', vars[3], '+', randCoeff(rng, 1, 4), ')', ')', s1, vars[4], s2, vars[5]],
      right: [vars[6], s3, randCoeff(rng, 1, 7)],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // Huge: ax + by + cz + d + e + f = gw + hv + k + m
    // 8+ additive moves + 1 division = 7-9 steps
    () => ({
      left: [c1, '*', target, '+', c2, '*', vars[1], s1, c3, '*', vars[2], s2, vars[3], s3, randCoeff(rng, 1, 7), s4, vars[4]],
      right: [randCoeff(rng, 2, 5), '*', vars[5], '+', randCoeff(rng, 2, 4), '*', vars[6], '-', vars[7], '+', randCoeff(rng, 1, 6)],
      target,
      ops: ['+', '-', '*'],
    }),
    // ax/(b+c) + dy + ez + f + g = h + k + m
    // move dy(1), ez(2), f(3), g(4), multiply(b+c)(5), divide a(6) + manage right = 7+ steps
    () => ({
      left: [c1, '*', target, '/', '(', vars[1], s1, randCoeff(rng, 1, 5), ')', '+', c2, '*', vars[2], s2, c3, '*', vars[3], s3, randCoeff(rng, 1, 6), s4, vars[4]],
      right: [vars[5], '+', vars[6], '-', randCoeff(rng, 1, 8)],
      target,
      ops: ['+', '-', '*', '/'],
    }),
    // p + q + r + s + t = ax/(b+c) + d + e + f
    // move d(1), e(2), f(3) to left, then p,q,r,s,t on left too, multiply(b+c)(4), divide a(5) = 8+ steps
    () => ({
      left: [vars[1], s1, vars[2], s2, vars[3], s3, randCoeff(rng, 1, 7), s4, vars[4]],
      right: [c1, '*', target, '/', '(', vars[5], '+', randCoeff(rng, 1, 4), ')', '+', vars[6], '-', vars[7], '+', randCoeff(rng, 1, 5)],
      target,
      ops: ['+', '-', '*', '/'],
    }),
  ];
  return pick(rng, patterns)();
}

// ============================================================================
// MODE 2: SIMPLIFY EXPRESSION — procedural generator
// Difficulty = number of combine (drag-merge) operations required.
//
// Each "combine" = dragging one like term onto another to merge them.
// N terms of the same kind require (N-1) combines.
//
// Level 1 (Easy):     ~2 combines — two variable groups with 2 terms each
// Level 2 (Medium):   ~3-4 combines — multiple groups, constants, powers
// Level 3 (Hard):     ~5-6 combines — 3+ groups with 3+ terms each
// Level 4 (Olympiad): ~7+ combines — many groups, many terms, mixed types
// ============================================================================

// ---------------------------------------------------------------------------
// Level 1: ~2 combines
// ---------------------------------------------------------------------------
function generateSimplifyLevel1(rng) {
  const [v1, v2] = pickN(rng, VARS_POOL, 2);
  const patterns = [
    // ax + bx + cy - dy  →  combine x-terms (1), combine y-terms (2) = 2 combines
    () => {
      const a = randInt(rng, 2, 7);
      const b = randInt(rng, 1, 6);
      const c = randInt(rng, 3, 8);
      const d = randInt(rng, 1, c - 1);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v1, '+', String(c), '*', v2, '-', String(d), '*', v2],
        expected: [String(a + b), '*', v1, '+', String(c - d), '*', v2],
      };
    },
    // ax + b + cx + d  →  combine x-terms (1), combine constants (2) = 2 combines
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
    // ax - b + cx + d  →  combine x-terms (1), combine constants (2) = 2 combines
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
    // ax + by + cx  →  combine x-terms (1), y stays = 1-2 combines
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 1, 5);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '+', String(c), '*', v1],
        expected: [String(a + c), '*', v1, '+', String(b), '*', v2],
      };
    },
    // ax + by - cx + dy  →  combine x-terms (1), combine y-terms (2) = 2 combines
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
  ];
  return pick(rng, patterns)();
}

// ---------------------------------------------------------------------------
// Level 2: ~3-4 combines — multiple groups, constants, parenthesized terms, powers
// ---------------------------------------------------------------------------
function generateSimplifyLevel2(rng) {
  const [v1, v2, v3] = pickN(rng, VARS_POOL, 3);
  const patterns = [
    // ax + by + c + dx - ey + f  →  x-terms (1), y-terms (2), constants (3) = 3 combines
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 2, 5);
      const c = randInt(rng, 3, 12);
      const d = randInt(rng, 1, 5);
      const e = randInt(rng, 1, b - 1);
      const f = randInt(rng, 1, 8);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '+', String(c), '+', String(d), '*', v1, '-', String(e), '*', v2, '+', String(f)],
        expected: [String(a + d), '*', v1, '+', String(b - e), '*', v2, '+', String(c + f)],
      };
    },
    // ax + by + cz - dx + ey - fz  →  x-terms (1), y-terms (2), z-terms (3) = 3 combines
    () => {
      const a = randInt(rng, 4, 8);
      const b = randInt(rng, 3, 7);
      const c = randInt(rng, 3, 6);
      const d = randInt(rng, 1, a - 1);
      const e = randInt(rng, 1, 5);
      const f = randInt(rng, 1, c - 1);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '+', String(c), '*', v3, '-', String(d), '*', v1, '+', String(e), '*', v2, '-', String(f), '*', v3],
        expected: [String(a - d), '*', v1, '+', String(b + e), '*', v2, '+', String(c - f), '*', v3],
      };
    },
    // ax + bx + cx + dy  →  3 x-terms need 2 combines (1,2) + y stays = 2-3 combines
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 1, 4);
      const d = randInt(rng, 1, 6);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v1, '+', String(c), '*', v1, '+', String(d), '*', v2],
        expected: [String(a + b + c), '*', v1, '+', String(d), '*', v2],
      };
    },
    // a(x+y) + b(x+y) + cz  →  combine parens (1), z stays = 1-2 combines + parenthesized groups
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 1, 7);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [String(a), '*', '(', v1, op, v2, ')', '+', String(b), '*', '(', v1, op, v2, ')', '+', String(c), '*', v3],
        expected: [String(a + b), '*', '(', v1, op, v2, ')', '+', String(c), '*', v3],
      };
    },
    // ax² + bx² + cx + dx  →  combine x² terms (1), combine x terms (2) = 2-3 combines
    () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 1, 5);
      const c = randInt(rng, 2, 7);
      const d = randInt(rng, 1, 5);
      const pow = pick(rng, ['x^2', 'a^2', 'y^2']);
      const baseVar = pow[0]; // 'x', 'a', or 'y'
      return {
        expr: [String(a), '*', pow, '+', String(b), '*', pow, '+', String(c), '*', baseVar, '+', String(d), '*', baseVar],
        expected: [String(a + b), '*', pow, '+', String(c + d), '*', baseVar],
      };
    },
    // ap + bq - cp + dq - e + f  →  p-terms(1), q-terms(2), constants(3) = 3 combines
    () => {
      const a = randInt(rng, 5, 10);
      const b = randInt(rng, 2, 6);
      const c = randInt(rng, 1, a - 1);
      const d = randInt(rng, 1, 4);
      const e = randInt(rng, 3, 10);
      const f = randInt(rng, 1, e - 1);
      return {
        expr: [String(a), '*', v1, '+', String(b), '*', v2, '-', String(c), '*', v1, '+', String(d), '*', v2, '-', String(e), '+', String(f)],
        expected: [String(a - c), '*', v1, '+', String(b + d), '*', v2, '-', String(e - f)],
      };
    },
  ];
  return pick(rng, patterns)();
}

// ---------------------------------------------------------------------------
// Level 3: ~5-6 combines — 3+ groups with 3+ terms each, powers, parenthesized groups
// ---------------------------------------------------------------------------
function generateSimplifyLevel3(rng) {
  const [v1, v2, v3] = pickN(rng, VARS_POOL, 3);
  const patterns = [
    // 4 x-terms + 3 y-terms: (3 combines for x) + (2 combines for y) = 5 combines
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, 4);
      const d = randInt(rng, 1, 3);
      const e = randInt(rng, 2, 5);
      const f = randInt(rng, 1, 4);
      const g = randInt(rng, 1, 3);
      return {
        expr: [
          String(a), '*', v1, '+', String(e), '*', v2, '+', String(b), '*', v1,
          '-', String(f), '*', v2, '+', String(c), '*', v1, '+', String(g), '*', v2,
          '+', String(d), '*', v1,
        ],
        expected: [String(a + b + c + d), '*', v1, '+', String(e - f + g), '*', v2],
      };
    },
    // 3 x-terms + 3 y-terms + 2 constants = (2 + 2 + 1) = 5 combines
    () => {
      const a = randInt(rng, 3, 7);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 2, 6);
      const e = randInt(rng, 1, 4);
      const f = randInt(rng, 1, 3);
      const g = randInt(rng, 3, 10);
      const h = randInt(rng, 1, 8);
      return {
        expr: [
          String(a), '*', v1, '+', String(d), '*', v2, '+', String(g),
          '+', String(b), '*', v1, '-', String(e), '*', v2, '+', String(h),
          '-', String(c), '*', v1, '+', String(f), '*', v2,
        ],
        expected: [String(a + b - c), '*', v1, '+', String(d - e + f), '*', v2, '+', String(g + h)],
      };
    },
    // 3 x-terms + 2 y-terms + 2 z-terms = (2 + 1 + 1) = 4-5 combines
    // plus constants for extra
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 2, 5);
      const e = randInt(rng, 1, 3);
      const f = randInt(rng, 2, 5);
      const g = randInt(rng, 1, 3);
      const h = randInt(rng, 2, 8);
      return {
        expr: [
          String(a), '*', v1, '+', String(d), '*', v2, '+', String(f), '*', v3, '+', String(h),
          '+', String(b), '*', v1, '-', String(e), '*', v2, '+', String(g), '*', v3,
          '-', String(c), '*', v1,
        ],
        expected: [String(a + b - c), '*', v1, '+', String(d - e), '*', v2, '+', String(f + g), '*', v3, '+', String(h)],
      };
    },
    // 3 (a+b) terms + 2 constants + 2 z-terms = (2 + 1 + 1) = 4-5 combines
    () => {
      const a = randInt(rng, 3, 7);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, a + b - 2);
      const d = randInt(rng, 2, 6);
      const e = randInt(rng, 1, 4);
      const f = randInt(rng, 3, 10);
      const g = randInt(rng, 1, 7);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [
          String(a), '*', '(', v1, op, v2, ')', '+', String(d), '*', v3, '+', String(f),
          '+', String(b), '*', '(', v1, op, v2, ')', '+', String(e), '*', v3, '+', String(g),
          '-', String(c), '*', '(', v1, op, v2, ')',
        ],
        expected: [String(a + b - c), '*', '(', v1, op, v2, ')', '+', String(d + e), '*', v3, '+', String(f + g)],
      };
    },
    // x² group (3 terms) + x group (3 terms) = (2 + 2) = 4-5 combines
    () => {
      const a = randInt(rng, 3, 7);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 2, 6);
      const e = randInt(rng, 1, 4);
      const f = randInt(rng, 1, 3);
      const pow = pick(rng, ['x^2', 'a^2']);
      const baseVar = pow[0];
      return {
        expr: [
          String(a), '*', pow, '+', String(d), '*', baseVar,
          '-', String(b), '*', pow, '+', String(e), '*', baseVar,
          '+', String(c), '*', pow, '-', String(f), '*', baseVar,
        ],
        expected: [String(a - b + c), '*', pow, '+', String(d + e - f), '*', baseVar],
      };
    },
    // ax/d + bx/d + cy + ey + f + g - cx/d  →  3 rational x (2 combines) + 2 y (1) + 2 const (1) = 5
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, a + b - 2);
      const d = randInt(rng, 2, 5);
      const e = randInt(rng, 1, 4);
      const f = randInt(rng, 3, 10);
      const g = randInt(rng, 1, 7);
      const dn = randCoeff(rng, 2, 5);
      return {
        expr: [
          String(a), '*', v1, '/', dn, '+', String(d), '*', v2, '+', String(f),
          '+', String(b), '*', v1, '/', dn, '+', String(e), '*', v2, '+', String(g),
          '-', String(c), '*', v1, '/', dn,
        ],
        expected: [String(a + b - c), '*', v1, '/', dn, '+', String(d + e), '*', v2, '+', String(f + g)],
      };
    },
  ];
  return pick(rng, patterns)();
}

// ---------------------------------------------------------------------------
// Level 4: ~7+ combines — many groups, many terms per group, mixed types
// ---------------------------------------------------------------------------
function generateSimplifyLevel4(rng) {
  const [v1, v2, v3, v4] = pickN(rng, VARS_POOL, 4);
  const patterns = [
    // 5 x-terms + 4 y-terms = (4 + 3) = 7 combines
    () => {
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 1, 3);
      const e = randInt(rng, 1, 3);
      const f = randInt(rng, 2, 5);
      const g = randInt(rng, 1, 4);
      const h = randInt(rng, 1, 3);
      const k = randInt(rng, 1, 3);
      return {
        expr: [
          String(a), '*', v1, '+', String(f), '*', v2,
          '+', String(b), '*', v1, '-', String(g), '*', v2,
          '+', String(c), '*', v1, '+', String(h), '*', v2,
          '-', String(d), '*', v1, '+', String(k), '*', v2,
          '+', String(e), '*', v1,
        ],
        expected: [String(a + b + c - d + e), '*', v1, '+', String(f - g + h + k), '*', v2],
      };
    },
    // 4 x-terms + 3 y-terms + 3 constants = (3 + 2 + 2) = 7 combines
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 3);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 1, 2);
      const e = randInt(rng, 2, 5);
      const f = randInt(rng, 1, 3);
      const g = randInt(rng, 1, 3);
      const h = randInt(rng, 3, 8);
      const k = randInt(rng, 1, 5);
      const m = randInt(rng, 1, 4);
      return {
        expr: [
          String(a), '*', v1, '+', String(e), '*', v2, '+', String(h),
          '+', String(b), '*', v1, '-', String(f), '*', v2, '+', String(k),
          '-', String(c), '*', v1, '+', String(g), '*', v2, '-', String(m),
          '+', String(d), '*', v1,
        ],
        expected: [String(a + b - c + d), '*', v1, '+', String(e - f + g), '*', v2, '+', String(h + k - m)],
      };
    },
    // 3 x-terms + 3 y-terms + 3 z-terms = (2+2+2) = 6 combines + constants for 7+
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 3);
      const c = randInt(rng, 1, a + b - 2);
      const d = randInt(rng, 2, 5);
      const e = randInt(rng, 1, 3);
      const f = randInt(rng, 1, d + e - 2);
      const g = randInt(rng, 2, 5);
      const h = randInt(rng, 1, 3);
      const k = randInt(rng, 1, g + h - 2);
      const m = randInt(rng, 3, 10);
      const n = randInt(rng, 1, 7);
      return {
        expr: [
          String(a), '*', v1, '+', String(d), '*', v2, '+', String(g), '*', v3, '+', String(m),
          '+', String(b), '*', v1, '-', String(e), '*', v2, '+', String(h), '*', v3, '+', String(n),
          '-', String(c), '*', v1, '+', String(f), '*', v2, '-', String(k), '*', v3,
        ],
        expected: [
          String(a + b - c), '*', v1, '+', String(d - e + f), '*', v2,
          '+', String(g + h - k), '*', v3, '+', String(m + n),
        ],
      };
    },
    // 3 (p+q) terms + 3 r-terms + 3 constants = (2+2+2) = 6-7 combines
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 4);
      const c = randInt(rng, 1, a + b - 2);
      const d = randInt(rng, 2, 5);
      const e = randInt(rng, 1, 3);
      const f = randInt(rng, 1, d + e - 2);
      const g = randInt(rng, 4, 12);
      const h = randInt(rng, 1, 6);
      const k = randInt(rng, 1, g + h - 2);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [
          String(a), '*', '(', v1, op, v2, ')', '+', String(d), '*', v3, '+', String(g),
          '+', String(b), '*', '(', v1, op, v2, ')', '-', String(e), '*', v3, '+', String(h),
          '-', String(c), '*', '(', v1, op, v2, ')', '+', String(f), '*', v3, '-', String(k),
        ],
        expected: [
          String(a + b - c), '*', '(', v1, op, v2, ')', '+', String(d - e + f), '*', v3,
          '+', String(g + h - k),
        ],
      };
    },
    // 4 x²-terms + 4 x-terms = (3+3) = 6-7 combines
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 3);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 1, 2);
      const e = randInt(rng, 3, 6);
      const f = randInt(rng, 1, 3);
      const g = randInt(rng, 1, 3);
      const h = randInt(rng, 1, 2);
      const pow = pick(rng, ['x^2', 'a^2', 'y^2']);
      const baseVar = pow[0];
      return {
        expr: [
          String(a), '*', pow, '+', String(e), '*', baseVar,
          '-', String(b), '*', pow, '+', String(f), '*', baseVar,
          '+', String(c), '*', pow, '-', String(g), '*', baseVar,
          '+', String(d), '*', pow, '+', String(h), '*', baseVar,
        ],
        expected: [String(a - b + c + d), '*', pow, '+', String(e + f - g + h), '*', baseVar],
      };
    },
    // 4 rational x/(v+c) terms + 3 y-terms + 2 constants = (3+2+1) = 6-7 combines
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 3);
      const c = randInt(rng, 1, 3);
      const d = randInt(rng, 1, 2);
      const e = randInt(rng, 2, 5);
      const f = randInt(rng, 1, 3);
      const g = randInt(rng, 1, 3);
      const h = randInt(rng, 4, 12);
      const k = randInt(rng, 1, 7);
      const cn = randCoeff(rng, 1, 5);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [
          String(a), '*', v1, '/', '(', v2, op, cn, ')', '+', String(e), '*', v3, '+', String(h),
          '+', String(b), '*', v1, '/', '(', v2, op, cn, ')', '-', String(f), '*', v3, '+', String(k),
          '-', String(c), '*', v1, '/', '(', v2, op, cn, ')', '+', String(g), '*', v3,
          '+', String(d), '*', v1, '/', '(', v2, op, cn, ')',
        ],
        expected: [
          String(a + b - c + d), '*', v1, '/', '(', v2, op, cn, ')',
          '+', String(e - f + g), '*', v3, '+', String(h + k),
        ],
      };
    },
    // 3 x-terms + 3 y-terms + 3 (p+q)-terms + 2 constants = (2+2+2+1) = 7 combines
    () => {
      const a = randInt(rng, 3, 6);
      const b = randInt(rng, 1, 3);
      const c = randInt(rng, 1, a + b - 2);
      const d = randInt(rng, 2, 5);
      const e = randInt(rng, 1, 3);
      const f = randInt(rng, 1, d + e - 2);
      const g = randInt(rng, 2, 5);
      const h = randInt(rng, 1, 3);
      const k = randInt(rng, 1, g + h - 2);
      const m = randInt(rng, 3, 10);
      const n = randInt(rng, 1, 6);
      const op = pick(rng, ['+', '-']);
      return {
        expr: [
          String(a), '*', v1, '+', String(d), '*', v2, '+', String(g), '*', '(', v3, op, v4, ')', '+', String(m),
          '+', String(b), '*', v1, '-', String(e), '*', v2, '+', String(h), '*', '(', v3, op, v4, ')', '+', String(n),
          '-', String(c), '*', v1, '+', String(f), '*', v2, '-', String(k), '*', '(', v3, op, v4, ')',
        ],
        expected: [
          String(a + b - c), '*', v1, '+', String(d - e + f), '*', v2,
          '+', String(g + h - k), '*', '(', v3, op, v4, ')', '+', String(m + n),
        ],
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
