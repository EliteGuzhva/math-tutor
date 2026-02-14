/**
 * Validates whether a drag/action operation is legal.
 * Returns { valid: boolean, ruleKey: string | null, result: object | null }
 */

import { cloneExpr, flipSign, uid } from './expressionModel';

/**
 * Moving an additive term across the equals sign.
 * The term's sign must flip.
 * RULE: the user should only move constants, not the variable term.
 */
export function validateMoveAdditive(exercise, termId, fromSide, toSide) {
  if (fromSide === toSide) {
    return { valid: false, ruleKey: 'cantMoveThis' };
  }

  const expr = cloneExpr(exercise.expr);
  const sourceArr = fromSide === 'left' ? expr.left : expr.right;
  const targetArr = toSide === 'left' ? expr.left : expr.right;

  const idx = sourceArr.findIndex((t) => t.id === termId);
  if (idx === -1) return { valid: false, ruleKey: 'cantMoveThis' };

  const movedTerm = sourceArr[idx];

  // GOAL: isolate the target variable. Don't allow moving its term.
  if (movedTerm.vars && movedTerm.vars.length > 0) {
    const targetVar = exercise.targetVar;
    if (targetVar) {
      // New style (letter vars): only block the target variable's term
      if (movedTerm.vars.includes(targetVar)) {
        return { valid: false, ruleKey: 'dontMoveVariable' };
      }
    } else {
      // Legacy style (numeric constants): block any variable term
      return { valid: false, ruleKey: 'dontMoveVariable' };
    }
  }

  // Can't leave a side empty
  if (sourceArr.length <= 1) {
    return { valid: false, ruleKey: 'cantMoveThis' };
  }

  const flipped = flipSign(movedTerm);
  sourceArr.splice(idx, 1);
  targetArr.push(flipped);

  return { valid: true, ruleKey: 'moveAdditive', result: expr };
}

/**
 * Moving a multiplicative factor across equals (new model).
 *
 * action.piece: 'coeff' | 'var'
 * action.target: 'num' | 'den' | null
 * action.coeffValue: the coefficient being moved
 *
 * RULES:
 * - Moving the variable is WRONG (we want to isolate it).
 * - Moving the coefficient to the NUMERATOR is WRONG (multiplier doesn't stay multiplier).
 * - Moving the coefficient to the DENOMINATOR is CORRECT.
 */
export function validateMoveMultiplicativeNew(exercise, action) {
  // User tried to move the variable -- error
  if (action.piece === 'var') {
    return { valid: false, ruleKey: 'dontMoveVariable' };
  }

  // User moved coefficient to numerator -- error
  if (action.target === 'num') {
    return { valid: false, ruleKey: 'multToDenominator' };
  }

  // User moved coefficient to denominator -- CORRECT
  if (action.piece === 'coeff' && action.target === 'den') {
    const expr = cloneExpr(exercise.expr);
    const leftTerm = expr.left[0];
    const rightTerms = expr.right; // support multi-term right side

    const coeff = action.coeffValue || leftTerm.coeff;
    const varName = leftTerm.vars[0];

    // Result: varName = (all right terms) / coeff
    const result = {
      type: 'equation',
      left: [{ id: uid(), coeff: 1, vars: [varName], sign: '+' }],
      right: [
        {
          id: uid(),
          type: 'fraction',
          num: rightTerms.map((t) => ({ ...t, id: uid() })),
          den: [{ id: uid(), coeff, vars: [], sign: '+' }],
        },
      ],
    };

    return { valid: true, ruleKey: 'moveMultiplicative', result };
  }

  return { valid: false, ruleKey: 'cantMoveThis' };
}

/**
 * Simplifying a fraction by canceling a user-chosen common factor.
 */
export function validateSimplify(exercise, factorValue) {
  const expr = cloneExpr(exercise.expr);
  if (expr.type !== 'fraction') return { valid: false, ruleKey: 'wrongOperation' };

  const numTerm = expr.num[0];
  const denTerm = expr.den[0];

  if (!numTerm || !denTerm) return { valid: false, ruleKey: 'wrongOperation' };

  if (numTerm.coeff % factorValue !== 0 || denTerm.coeff % factorValue !== 0) {
    return { valid: false, ruleKey: 'simplify' };
  }

  numTerm.coeff /= factorValue;
  denTerm.coeff /= factorValue;

  return { valid: true, ruleKey: 'simplify', result: expr };
}

/**
 * Cross multiplication: a/b = c/d -> ad = bc
 */
export function validateCrossMultiply(exercise) {
  const expr = cloneExpr(exercise.expr);
  if (expr.type !== 'equation') return { valid: false, ruleKey: 'wrongOperation' };

  const leftFrac = expr.left[0];
  const rightFrac = expr.right[0];
  if (!leftFrac || leftFrac.type !== 'fraction' || !rightFrac || rightFrac.type !== 'fraction') {
    return { valid: false, ruleKey: 'wrongOperation' };
  }

  const a = leftFrac.num[0];
  const d = rightFrac.den[0];
  const b = leftFrac.den[0];
  const c = rightFrac.num[0];

  const newLeft = {
    id: uid(),
    coeff: a.coeff * d.coeff,
    vars: [...a.vars, ...d.vars],
    sign: '+',
  };
  const newRight = {
    id: uid(),
    coeff: b.coeff * c.coeff,
    vars: [...b.vars, ...c.vars],
    sign: '+',
  };

  return {
    valid: true,
    ruleKey: 'crossMultiply',
    result: { type: 'equation', left: [newLeft], right: [newRight] },
  };
}

/**
 * Combine fractions: n1/d1 + n2/d2 -> (n1*d2 + n2*d1) / (d1*d2)
 */
export function validateCombineFractions(exercise) {
  const expr = cloneExpr(exercise.expr);
  if (expr.type !== 'sum_of_fractions' || expr.fractions.length < 2) {
    return { valid: false, ruleKey: 'wrongOperation' };
  }

  const f1 = expr.fractions[0];
  const f2 = expr.fractions[1];

  const n1 = f1.num[0];
  const d1 = f1.den[0];
  const n2 = f2.num[0];
  const d2 = f2.den[0];

  const newNum1 = {
    id: uid(),
    coeff: n1.coeff * d2.coeff,
    vars: [...n1.vars, ...d2.vars],
    sign: '+',
  };
  const newNum2 = {
    id: uid(),
    coeff: n2.coeff * d1.coeff,
    vars: [...n2.vars, ...d1.vars],
    sign: '+',
  };
  const newDen = {
    id: uid(),
    coeff: d1.coeff * d2.coeff,
    vars: [...d1.vars, ...d2.vars],
    sign: '+',
  };

  const result = {
    id: uid(),
    type: 'fraction',
    num: [newNum1, newNum2],
    den: [newDen],
  };

  return { valid: true, ruleKey: 'combineFractions', result };
}

/**
 * Generic validation dispatcher
 */
export function validate(exercise, action) {
  switch (action.type) {
    case 'moveAdditive':
      return validateMoveAdditive(exercise, action.termId, action.fromSide, action.toSide);
    case 'moveMultiplicative':
      return validateMoveMultiplicativeNew(exercise, action);
    case 'simplify':
      return validateSimplify(exercise, action.factorValue);
    case 'simplifyWrong':
      return { valid: false, ruleKey: 'simplify' };
    case 'crossMultiply':
      return validateCrossMultiply(exercise);
    case 'combineFractions':
      return validateCombineFractions(exercise);
    default:
      return { valid: false, ruleKey: 'wrongOperation' };
  }
}
