import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Fraction from './Fraction';
import Operator from './Operator';
import Term from './Term';
import { getVarColor } from '../utils/colors';
import { spring } from '../utils/animations';

/**
 * DivisorPicker: the user must manually pick what number to divide by.
 * Shows small number buttons. Wrong picks shake; correct picks succeed.
 */
function DivisorPicker({ onPick, shake }) {
  const divisors = [2, 3, 4, 5, 6, 7];

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#6b7280' }}>
        На сколько сократить?
      </span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {divisors.map((d) => (
          <motion.button
            key={d}
            onClick={() => onPick(d)}
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={{ scale: 0.9 }}
            animate={shake === d ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(139,92,246,0.08)',
              border: '2.5px solid rgba(139,92,246,0.2)',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {d}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * CrossMultiplyExercise: user drags numerator from one side to the
 * denominator of the other. Both cross-pairs must be matched.
 */
function CrossMultiplyView({ exercise, onAction }) {
  const { expr } = exercise;
  const [selected, setSelected] = useState(null); // { id, role: 'leftNum'|'leftDen'|'rightNum'|'rightDen' }
  const [matched, setMatched] = useState([]); // completed pairs

  if (expr.type !== 'equation') return null;
  const leftFrac = expr.left[0];
  const rightFrac = expr.right[0];
  if (!leftFrac || leftFrac.type !== 'fraction' || !rightFrac || rightFrac.type !== 'fraction')
    return null;

  const a = leftFrac.num[0];  // left numerator
  const b = leftFrac.den[0];  // left denominator
  const c = rightFrac.num[0]; // right numerator
  const d = rightFrac.den[0]; // right denominator

  // Valid pairs for cross multiplication: (a,d) and (b,c)
  const validPairs = [
    ['leftNum', 'rightDen'],
    ['rightDen', 'leftNum'],
    ['leftDen', 'rightNum'],
    ['rightNum', 'leftDen'],
  ];

  const handleTap = (termData, role) => {
    if (matched.some((m) => m.includes(role))) return; // already matched

    if (!selected) {
      setSelected({ id: termData.id, role });
      return;
    }

    // Check if this completes a valid cross pair
    const pair = [selected.role, role];
    const isValid = validPairs.some(
      (vp) =>
        (vp[0] === pair[0] && vp[1] === pair[1]) ||
        (vp[0] === pair[1] && vp[1] === pair[0])
    );

    if (isValid) {
      const newMatched = [...matched, selected.role, role];
      setMatched(newMatched);
      setSelected(null);

      // If both pairs are matched, fire the action
      if (newMatched.length >= 4) {
        setTimeout(() => {
          onAction?.({ type: 'crossMultiply' });
        }, 600);
      }
    } else {
      setSelected(null);
    }
  };

  const isSelected = (role) => selected?.role === role;
  const isMatched = (role) => matched.includes(role);

  const termStyle = (role) => ({
    cursor: isMatched(role) ? 'default' : 'pointer',
    opacity: isMatched(role) ? 0.4 : 1,
    background: isSelected(role)
      ? 'rgba(139,92,246,0.15)'
      : 'transparent',
    borderRadius: '8px',
    padding: '4px 8px',
    transition: 'background 0.2s, opacity 0.3s',
  });

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      <motion.div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Left fraction */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <motion.div
            style={termStyle('leftNum')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTap(a, 'leftNum')}
          >
            <Term data={a} isDraggable={false} showSign={false} />
          </motion.div>
          <div style={{ width: '100%', minWidth: 50, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)' }} />
          <motion.div
            style={termStyle('leftDen')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTap(b, 'leftDen')}
          >
            <Term data={b} isDraggable={false} showSign={false} />
          </motion.div>
        </div>

        <Operator type="=" />

        {/* Right fraction */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <motion.div
            style={termStyle('rightNum')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTap(c, 'rightNum')}
          >
            <Term data={c} isDraggable={false} showSign={false} />
          </motion.div>
          <div style={{ width: '100%', minWidth: 50, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)' }} />
          <motion.div
            style={termStyle('rightDen')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTap(d, 'rightDen')}
          >
            <Term data={d} isDraggable={false} showSign={false} />
          </motion.div>
        </div>
      </motion.div>

      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#9ca3af' }}>
        {matched.length === 0
          ? 'Нажми на числитель одной дроби, потом на знаменатель другой'
          : matched.length < 4
          ? 'Теперь соедини вторую пару'
          : 'Готово!'}
      </span>
    </motion.div>
  );
}

/**
 * CombineFractionsView: user selects the common denominator from options.
 */
function CombineFractionsView({ exercise, onAction }) {
  const { expr } = exercise;
  const [wrongPick, setWrongPick] = useState(null);

  if (expr.type !== 'sum_of_fractions') return null;

  const f1 = expr.fractions[0];
  const f2 = expr.fractions[1];
  const d1 = f1.den[0];
  const d2 = f2.den[0];

  // The correct common denominator description
  const correctLabel = `${d1.vars[0] || d1.coeff} · ${d2.vars[0] || d2.coeff}`;

  // Generate options (correct + distractors)
  const v1 = d1.vars[0] || String(d1.coeff);
  const v2 = d2.vars[0] || String(d2.coeff);
  const options = [
    { label: `${v1} · ${v2}`, correct: true },
    { label: `${v1} + ${v2}`, correct: false },
    { label: `${v1}`, correct: false },
    { label: `${v2}`, correct: false },
  ].sort(() => Math.random() - 0.5);

  const handlePick = (opt) => {
    if (opt.correct) {
      onAction?.({ type: 'combineFractions' });
    } else {
      setWrongPick(opt.label);
      setTimeout(() => setWrongPick(null), 500);
    }
  };

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px',
        padding: '20px',
      }}
    >
      {/* Fractions display */}
      <motion.div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Fraction data={f1} isDraggable={false} />
        <Operator type="+" />
        <Fraction data={f2} isDraggable={false} />
      </motion.div>

      {/* Question */}
      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>
        Какой общий знаменатель?
      </span>

      {/* Options */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {options.map((opt) => (
          <motion.button
            key={opt.label}
            onClick={() => handlePick(opt)}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.94 }}
            animate={
              wrongPick === opt.label
                ? { x: [0, -8, 8, -6, 6, -3, 3, 0], backgroundColor: 'rgba(239,68,68,0.15)' }
                : {}
            }
            style={{
              padding: '14px 28px',
              borderRadius: '14px',
              background: 'rgba(139,92,246,0.06)',
              border: '2.5px solid rgba(139,92,246,0.18)',
              fontSize: '1.3rem',
              fontWeight: 800,
              color: '#5b21b6',
            }}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/**
 * Main FractionExercise dispatcher
 */
export default function FractionExercise({ exercise, onAction }) {
  const { expr, module: mod } = exercise;
  const [shakeDivisor, setShakeDivisor] = useState(null);

  const handleDivisorPick = useCallback(
    (divisor) => {
      if (expr.type !== 'fraction') return;
      const numCoeff = expr.num[0]?.coeff;
      const denCoeff = expr.den[0]?.coeff;

      if (numCoeff % divisor === 0 && denCoeff % divisor === 0) {
        onAction?.({ type: 'simplify', factorValue: divisor });
      } else {
        setShakeDivisor(divisor);
        onAction?.({ type: 'simplifyWrong', factorValue: divisor });
        setTimeout(() => setShakeDivisor(null), 600);
      }
    },
    [expr, onAction]
  );

  // ---- Simplify fraction ----
  if (mod === 'simplify' && expr.type === 'fraction') {
    const currentNum = expr.num[0]?.coeff || 1;
    const currentDen = expr.den[0]?.coeff || 1;
    const currentGcd = gcd(currentNum, currentDen);
    const isFullySimplified = currentGcd <= 1;
    const varName = expr.num[0]?.vars?.[0] || '';
    const target = exercise.target;

    return (
      <motion.div
        layout
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          padding: '20px',
        }}
        transition={spring}
      >
        {/* Target display */}
        {target && !isFullySimplified && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 20px',
              borderRadius: '14px',
              background: 'rgba(34,197,94,0.06)',
              border: '2px solid rgba(34,197,94,0.15)',
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6b7280' }}>
              Цель:
            </span>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22c55e', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span>{target.numCoeff === 1 && target.varName ? '' : target.numCoeff}{target.varName}</span>
              <div style={{ width: '100%', height: 3, borderRadius: 2, background: '#22c55e' }} />
              <span>{target.denCoeff}</span>
            </span>
          </motion.div>
        )}

        {/* Current fraction */}
        <Fraction data={expr} isDraggable={false} />

        {/* Step indicator */}
        {!isFullySimplified && (
          <motion.span
            key={currentGcd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9ca3af' }}
          >
            Можно ещё сократить!
          </motion.span>
        )}

        {/* Divisor picker */}
        {!isFullySimplified && (
          <DivisorPicker onPick={handleDivisorPick} shake={shakeDivisor} />
        )}
      </motion.div>
    );
  }

  // ---- Cross multiply ----
  if (mod === 'crossMultiply') {
    return <CrossMultiplyView exercise={exercise} onAction={onAction} />;
  }

  // ---- Combine fractions ----
  if (mod === 'combineFractions') {
    return <CombineFractionsView exercise={exercise} onAction={onAction} />;
  }

  // Fallback for result states (after operation completes)
  if (expr.type === 'fraction') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ padding: '20px' }}
      >
        <Fraction data={expr} isDraggable={false} />
      </motion.div>
    );
  }

  if (expr.type === 'equation') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '12px',
          padding: '20px',
          fontSize: '2.4rem',
          fontWeight: 800,
        }}
      >
        {expr.left.map((t) => (
          <Term key={t.id} data={t} isDraggable={false} showSign={false} />
        ))}
        <Operator type="=" />
        {expr.right.map((t) => (
          <Term key={t.id} data={t} isDraggable={false} showSign={false} />
        ))}
      </motion.div>
    );
  }

  return null;
}
