import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Term from './Term';
import Operator from './Operator';
import Fraction from './Fraction';
import DropZone from './DropZone';
import { spring } from '../utils/animations';

function getEqualsRect(containerRef, equalsRef) {
  if (!containerRef.current || !equalsRef.current) return null;
  return equalsRef.current.getBoundingClientRect();
}

export default function Equation({ exercise, onAction, isDraggable = true }) {
  const { expr } = exercise;
  const [activeSide, setActiveSide] = useState(null);
  const [dragState, setDragState] = useState(null); // { termId, fromSide, hasCrossed }
  const containerRef = useRef(null);
  const equalsRef = useRef(null);

  // Real-time drag tracking: detect when term crosses the = sign
  const handleDrag = useCallback(
    (e, info, term, fromSide) => {
      if (!equalsRef.current) return;
      const eqRect = equalsRef.current.getBoundingClientRect();
      const eqCenter = eqRect.left + eqRect.width / 2;
      const dragX = info.point.x;

      const isOnOtherSide =
        (fromSide === 'left' && dragX > eqCenter) ||
        (fromSide === 'right' && dragX < eqCenter);

      setDragState((prev) => {
        if (!prev || prev.termId !== term.id) {
          return { termId: term.id, fromSide, hasCrossed: isOnOtherSide };
        }
        if (prev.hasCrossed !== isOnOtherSide) {
          return { ...prev, hasCrossed: isOnOtherSide };
        }
        return prev;
      });

      // Update active side highlight
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      setActiveSide(dragX < mid ? 'left' : 'right');
    },
    []
  );

  const handleTermDragEnd = useCallback(
    (e, info, term, fromSide, fromPosition) => {
      const wasCrossed = dragState?.termId === term.id && dragState?.hasCrossed;

      setDragState(null);
      setActiveSide(null);

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dropX = info.point.x;
      const midpoint = rect.left + rect.width / 2;
      const toSide = dropX < midpoint ? 'left' : 'right';

      if (toSide !== fromSide) {
        onAction?.({
          type: exercise.module === 'moveMultiplicative' ? 'moveMultiplicative' : 'moveAdditive',
          termId: term.id,
          fromSide,
          toSide,
          fromPosition,
        });
      }
    },
    [exercise, onAction, dragState]
  );

  if (!expr || expr.type !== 'equation') return null;

  // Determine if a specific term's sign should be visually overridden (mid-air flip)
  const getSignOverride = (term, side) => {
    if (!dragState || dragState.termId !== term.id) return undefined;
    if (!dragState.hasCrossed) return undefined;
    // The sign flips when it crosses the = sign
    return term.sign === '+' ? '-' : '+';
  };

  const renderItems = (items, side) => {
    return items.map((item, i) => {
      if (item.type === 'fraction') {
        return (
          <Fraction
            key={item.id}
            data={item}
            isDraggable={isDraggable}
            onTermDragEnd={(e, info, t, position) =>
              handleTermDragEnd(e, info, t, side, position)
            }
            onTermDrag={(e, info, t) => handleDrag(e, info, t, side)}
            getSignOverride={(t) => getSignOverride(t, side)}
          />
        );
      }

      const showSign = i > 0 || item.sign === '-';
      return (
        <Term
          key={item.id}
          data={item}
          showSign={showSign}
          signOverride={getSignOverride(item, side)}
          isDraggable={isDraggable}
          onDragEnd={(e, info) => handleTermDragEnd(e, info, item, side, null)}
          onDrag={(e, info) => handleDrag(e, info, item, side)}
        />
      );
    });
  };

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
      {/* Drag instruction */}
      <AnimatePresence>
        {!dragState && (
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
            Перетащи элемент на другую сторону
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equation */}
      <motion.div
        ref={containerRef}
        layout
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          width: '100%',
          padding: '24px 20px',
        }}
        transition={spring}
      >
        <DropZone side="left" isActive={activeSide === 'left' && !!dragState}>
          <AnimatePresence mode="popLayout">
            {renderItems(expr.left, 'left')}
          </AnimatePresence>
        </DropZone>

        <div ref={equalsRef}>
          <Operator type="=" />
        </div>

        <DropZone side="right" isActive={activeSide === 'right' && !!dragState}>
          <AnimatePresence mode="popLayout">
            {renderItems(expr.right, 'right')}
          </AnimatePresence>
        </DropZone>
      </motion.div>
    </motion.div>
  );
}
