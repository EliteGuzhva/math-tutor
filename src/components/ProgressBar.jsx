import { motion } from 'framer-motion';
import { spring } from '../utils/animations';

export default function ProgressBar({ current, total }) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '400px',
        height: '14px',
        borderRadius: '7px',
        background: 'rgba(139,92,246,0.1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={spring}
        style={{
          height: '100%',
          borderRadius: '7px',
          background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)',
          boxShadow: '0 0 12px rgba(139,92,246,0.4)',
        }}
      />

      {/* Shimmer */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          borderRadius: '7px',
        }}
      />
    </div>
  );
}
