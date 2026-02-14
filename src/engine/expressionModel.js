// ---- Expression Data Model ----
// Expressions are lightweight JS objects.
// We support equations, fractions, and sums of terms.

let _nextId = 1;
export function uid() {
  return 't' + _nextId++;
}

/**
 * piece({ type, value, name, sign })
 * Represents a single draggable piece (number, variable, or operator)
 */
export function piece({ type = 'number', value = 1, name = '', sign = '+' } = {}) {
  return { id: uid(), type, value, name, sign };
}

/**
 * term({ coeff, vars, sign })
 * Example: term({ coeff: 3, vars: ['x'], sign: '+' })
 * Now also supports pieces array for granular control
 */
export function term({ coeff = 1, vars = [], sign = '+', pieces = null } = {}) {
  if (pieces) {
    return { id: uid(), pieces, sign };
  }
  return { id: uid(), coeff, vars: [...vars], sign };
}

/**
 * fraction({ num, den })
 * num/den are arrays of terms OR a single coeff
 */
export function fraction({ num, den }) {
  return {
    id: uid(),
    type: 'fraction',
    num: Array.isArray(num) ? num : [term({ coeff: num })],
    den: Array.isArray(den) ? den : [term({ coeff: den })],
  };
}

/**
 * equation({ left, right })
 * left/right are arrays of terms or fractions
 */
export function equation({ left, right }) {
  return { type: 'equation', left, right };
}

/** Deep-clone an expression, assigning fresh IDs */
export function cloneExpr(expr) {
  return JSON.parse(JSON.stringify(expr));
}

/** Flip the sign of a term (for moving across =) */
export function flipSign(t) {
  return { ...t, id: uid(), sign: t.sign === '+' ? '-' : '+' };
}
