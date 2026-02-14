import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getVarColor, PALETTE } from '../utils/colors';
import { spring } from '../utils/animations';
import Operator from './Operator';

/**
 * Render an array of terms inline (e.g. "a + c" or "24").
 * Used for the right side of multiplicative equations.
 */
function renderTermsInline(terms, fontSize = '2.4rem') {
  return terms.map((t, i) => {
    const absCoeff = Math.abs(t.coeff);
    const hasVars = t.vars && t.vars.length > 0;
    const displayCoeff = absCoeff === 1 && hasVars ? '' : String(absCoeff);
    const showSign = i > 0 || t.sign === '-';
    const signChar = t.sign === '-' ? '−' : '+';

    return (
      <span
        key={t.id}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          fontSize,
          fontWeight: 800,
        }}
      >
        {showSign && (
          <span
            style={{
              color: t.sign === '-' ? '#ef4444' : '#22c55e',
              margin: '0 4px',
              fontWeight: 900,
              fontSize: `calc(${fontSize} * 0.8)`,
            }}
          >
            {signChar}
          </span>
        )}
        {displayCoeff && (
          <span style={{ color: PALETTE.number }}>{displayCoeff}</span>
        )}
        {t.vars?.map((v, j) => (
          <span
            key={v + j}
            style={{
              color: getVarColor(v),
              fontStyle: 'italic',
              textShadow: `0 0 28px ${getVarColor(v)}40`,
            }}
          >
            {v}
          </span>
        ))}
      </span>
    );
  });
}

/**
 * Dedicated component for multiplicative equations like 3x = 15 or 2b = a + c.
 *
 * Key differences from the additive Equation component:
 * - Coefficient and variable are rendered as SEPARATE draggable pieces.
 * - When dragging the coefficient, the receiving side splits into
 *   numerator (top) and denominator (bottom) drop targets.
 * - Dropping in denominator = correct (multiplier → divisor).
 * - Dropping in numerator = wrong.
 * - Dragging the variable = wrong (we want to isolate it).
 */
export default function MultiplicativeEquation({ exercise, onAction }) {
  const { expr } = exercise;
  const [dragPiece, setDragPiece] = useState(null); // 'coeff' | 'var' | null
  const [dropTarget, setDropTarget] = useState(null); // 'num' | 'den' | null
  const containerRef = useRef(null);
  const receivingRef = useRef(null);

  // The left side has one term with coeff and var
  const leftTerm = expr?.left?.[0];
  const rightTerms = expr?.right;
  if (!leftTerm || !rightTerms?.length) return null;

  const coeffValue = leftTerm.coeff;
  const varName = leftTerm.vars?.[0] || 'x';
  const varColor = getVarColor(varName);

  // -- Drag handlers for the coefficient --
  const handleCoeffDrag = useCallback((e, info) => {
    setDragPiece('coeff');
    if (!receivingRef.current) return;
    const rect = receivingRef.current.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropTarget(info.point.y < midY ? 'num' : 'den');
  }, []);

  const handleCoeffDragEnd = useCallback((e, info) => {
    const target = dropTarget;
    setDragPiece(null);
    setDropTarget(null);

    // Must have been dragged to the other side
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    const droppedOnRight = info.point.x > mid;

    if (!droppedOnRight) return; // Didn't cross the = sign

    onAction?.({
      type: 'moveMultiplicative',
      piece: 'coeff',
      target: target, // 'num' or 'den'
      coeffValue,
    });
  }, [dropTarget, onAction, coeffValue]);

  // -- Drag handler for the variable (always wrong) --
  const handleVarDragEnd = useCallback(() => {
    setDragPiece(null);
    setDropTarget(null);
    onAction?.({
      type: 'moveMultiplicative',
      piece: 'var',
      target: null,
    });
  }, [onAction]);

  const isDraggingCoeff = dragPiece === 'coeff';

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* Instruction */}
      <AnimatePresence>
        {!dragPiece && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '12px',
              background: 'rgba(139,92,246,0.08)',
              color: '#7c3aed',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            <motion.span
              animate={{ x: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              👆
            </motion.span>
            Перетащи множитель на другую сторону
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equation */}
      <motion.div
        ref={containerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          width: '100%',
          padding: '24px 20px',
        }}
      >
        {/* LEFT SIDE: coefficient · variable */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '2px',
            fontSize: '2.6rem',
            fontWeight: 800,
            padding: '16px 20px',
            borderRadius: '16px',
          }}
        >
          {/* Coefficient -- draggable */}
          <motion.span
            drag
            dragSnapToOrigin
            dragElastic={0.18}
            dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
            onDrag={handleCoeffDrag}
            onDragEnd={handleCoeffDragEnd}
            whileHover={{ scale: 1.12, y: -3 }}
            whileDrag={{ scale: 1.2, zIndex: 50 }}
            style={{
              color: PALETTE.number,
              cursor: 'grab',
              touchAction: 'none',
              display: 'inline-block',
              padding: '4px 2px',
              borderRadius: '8px',
              position: 'relative',
            }}
            transition={spring}
          >
            {coeffValue}
            {/* Underline hint that it's draggable */}
            <motion.div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '10%',
                right: '10%',
                height: '3px',
                borderRadius: '2px',
                background: 'rgba(99,102,241,0.3)',
              }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </motion.span>

          {/* Variable -- draggable but will trigger error */}
          <motion.span
            drag
            dragSnapToOrigin
            dragElastic={0.1}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
            onDragEnd={handleVarDragEnd}
            onDragStart={() => setDragPiece('var')}
            whileHover={{ scale: 1.08 }}
            style={{
              color: varColor,
              textShadow: `0 0 28px ${varColor}40`,
              fontStyle: 'italic',
              cursor: 'grab',
              touchAction: 'none',
              display: 'inline-block',
              padding: '4px 2px',
            }}
          >
            {varName}
          </motion.span>
        </div>

        {/* EQUALS */}
        <Operator type="=" />

        {/* RIGHT SIDE: shows num/den split when dragging coefficient */}
        <div
          ref={receivingRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '80px',
            padding: '8px 20px',
            borderRadius: '16px',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="wait">
            {isDraggingCoeff ? (
              /* Fraction layout with num/den targets */
              <motion.div
                key="fraction-targets"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0px',
                }}
              >
                {/* Numerator zone */}
                <motion.div
                  animate={{
                    backgroundColor:
                      dropTarget === 'num'
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(139,92,246,0.04)',
                    borderColor:
                      dropTarget === 'num'
                        ? 'rgba(239,68,68,0.4)'
                        : 'rgba(139,92,246,0.15)',
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    padding: '16px 28px',
                    borderRadius: '12px 12px 0 0',
                    border: '2px dashed',
                    borderBottom: 'none',
                    fontSize: '2.4rem',
                    fontWeight: 800,
                    color: PALETTE.number,
                    textAlign: 'center',
                    minWidth: '90px',
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {renderTermsInline(rightTerms, '2.4rem')}
                  {dropTarget === 'num' && (
                    <span style={{ color: '#ef4444', fontSize: '1rem', marginLeft: '4px' }}>
                      ✕
                    </span>
                  )}
                </motion.div>

                {/* Fraction bar */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)',
                    boxShadow: '0 0 12px rgba(139,92,246,0.3)',
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />

                {/* Denominator zone */}
                <motion.div
                  animate={{
                    backgroundColor:
                      dropTarget === 'den'
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(139,92,246,0.04)',
                    borderColor:
                      dropTarget === 'den'
                        ? 'rgba(34,197,94,0.4)'
                        : 'rgba(139,92,246,0.15)',
                  }}
                  style={{
                    padding: '16px 28px',
                    borderRadius: '0 0 12px 12px',
                    border: '2px dashed',
                    borderTop: 'none',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textAlign: 'center',
                    minWidth: '90px',
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {dropTarget === 'den' ? (
                    <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '2rem' }}>
                      {coeffValue}
                      <span style={{ fontSize: '1rem', marginLeft: '4px' }}>
                        ✓
                      </span>
                    </span>
                  ) : (
                    '?'
                  )}
                </motion.div>
              </motion.div>
            ) : (
              /* Normal display */
              <motion.div
                key="normal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 12px',
                }}
              >
                {rightTerms[0]?.type === 'fraction' ? (
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.4rem', fontWeight: 800 }}>
                      {renderTermsInline(rightTerms[0].num, '2.4rem')}
                    </span>
                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)' }} />
                    <span style={{ display: 'flex', alignItems: 'baseline', fontSize: '2rem', fontWeight: 800 }}>
                      {renderTermsInline(rightTerms[0].den, '2rem')}
                    </span>
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.6rem', fontWeight: 800 }}>
                    {renderTermsInline(rightTerms, '2.6rem')}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
