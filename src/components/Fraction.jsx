import { motion } from 'framer-motion';
import Term from './Term';
import Operator from './Operator';
import { PALETTE } from '../utils/colors';
import { spring } from '../utils/animations';

export default function Fraction({
  data,
  onTermDragEnd,
  onTermDrag,
  isDraggable = true,
  getSignOverride,
  highlightNum,
  highlightDen,
}) {
  const { num, den, id } = data;

  return (
    <motion.div
      layout
      layoutId={id}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
      }}
      transition={spring}
    >
      {/* Numerator */}
      <motion.div
        layout
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '4px',
          padding: '4px 8px',
          minWidth: '40px',
          borderRadius: '8px',
          background: highlightNum ? 'rgba(139,92,246,0.1)' : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        {num.map((t, i) => (
          <Term
            key={t.id}
            data={t}
            showSign={i > 0 || t.sign === '-'}
            signOverride={getSignOverride?.(t)}
            isDraggable={isDraggable}
            onDragEnd={(e, info) => onTermDragEnd?.(e, info, t, 'num')}
            onDrag={(e, info) => onTermDrag?.(e, info, t)}
          />
        ))}
      </motion.div>

      {/* Fraction bar */}
      <motion.div
        layout
        style={{
          width: '100%',
          minWidth: '50px',
          height: '4px',
          borderRadius: '2px',
          background: `linear-gradient(90deg, ${PALETTE.fractionBar}, ${PALETTE.equals})`,
          boxShadow: `0 0 16px ${PALETTE.fractionBar}30`,
        }}
        transition={spring}
      />

      {/* Denominator */}
      <motion.div
        layout
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '4px',
          padding: '4px 8px',
          minWidth: '40px',
          borderRadius: '8px',
          background: highlightDen ? 'rgba(139,92,246,0.1)' : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        {den.map((t, i) => (
          <Term
            key={t.id}
            data={t}
            showSign={i > 0 || t.sign === '-'}
            signOverride={getSignOverride?.(t)}
            isDraggable={isDraggable}
            onDragEnd={(e, info) => onTermDragEnd?.(e, info, t, 'den')}
            onDrag={(e, info) => onTermDrag?.(e, info, t)}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
