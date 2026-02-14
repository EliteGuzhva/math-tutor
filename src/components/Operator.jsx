import { motion } from 'framer-motion';
import { PALETTE } from '../utils/colors';

const styles = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  lineHeight: 1,
  userSelect: 'none',
};

export default function Operator({ type = '=', size = '2rem' }) {
  const isEquals = type === '=';
  const display = type === '+' ? '+' : type === '-' ? '−' : type === '*' ? '×' : type === '/' ? '÷' : '=';

  return (
    <motion.span
      style={{
        ...styles,
        fontSize: isEquals ? '2.4rem' : size,
        color: isEquals ? PALETTE.equals : PALETTE.operator,
        padding: isEquals ? '4px 16px' : '4px 6px',
        textShadow: isEquals ? `0 0 30px ${PALETTE.equals}60` : 'none',
      }}
      animate={
        isEquals
          ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }
          : {}
      }
    >
      {display}
    </motion.span>
  );
}
