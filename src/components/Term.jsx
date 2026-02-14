import { motion } from 'framer-motion';
import { getVarColor, PALETTE } from '../utils/colors';
import { spring, termVariants } from '../utils/animations';

/**
 * A single math term rendered as clean styled text -- no boxes.
 * The coefficient is dark, each variable letter has its own color.
 * Draggable when isDraggable is true.
 * `signOverride` can be passed to show a different sign (for mid-air flip).
 */
export default function Term({
  data,
  onDragEnd,
  onDrag,
  isDraggable = true,
  showSign = true,
  signOverride,
  layoutId,
}) {
  const { coeff, vars, sign } = data;
  const absCoeff = Math.abs(coeff);
  const displayCoeff = absCoeff === 1 && vars.length > 0 ? '' : String(absCoeff);
  const effectiveSign = signOverride ?? sign;
  const displaySign = effectiveSign === '-' ? '−' : '+';

  return (
    <motion.span
      layout
      layoutId={layoutId || data.id}
      className="term"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '1px',
        cursor: isDraggable ? 'grab' : 'default',
        fontSize: '2.6rem',
        fontWeight: 800,
        lineHeight: 1.2,
        position: 'relative',
        touchAction: 'none',
        padding: '4px 2px',
        borderRadius: '8px',
      }}
      variants={termVariants}
      initial="idle"
      whileHover={isDraggable ? 'hover' : undefined}
      whileDrag="drag"
      drag={isDraggable}
      dragSnapToOrigin
      dragElastic={0.18}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
      transition={spring}
    >
      {showSign && (
        <motion.span
          key={effectiveSign}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            color: effectiveSign === '-' ? '#ef4444' : '#22c55e',
            marginRight: '3px',
            fontWeight: 900,
            fontSize: '2rem',
            minWidth: '22px',
            textAlign: 'center',
            display: 'inline-block',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          {displaySign}
        </motion.span>
      )}

      {displayCoeff && (
        <span style={{ color: PALETTE.number, fontVariantNumeric: 'tabular-nums' }}>
          {displayCoeff}
        </span>
      )}

      {vars.map((v, i) => (
        <span
          key={v + i}
          style={{
            color: getVarColor(v),
            textShadow: `0 0 28px ${getVarColor(v)}40`,
            fontStyle: 'italic',
          }}
        >
          {v}
        </span>
      ))}
    </motion.span>
  );
}
