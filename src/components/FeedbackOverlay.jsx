import { motion, AnimatePresence } from 'framer-motion';
import { S } from '../utils/strings';

function Particle({ delay, x, y, color, size = 10 }) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
      animate={{
        opacity: [1, 1, 0],
        scale: [0, 1.2, 0.8],
        x: x,
        y: y,
      }}
      transition={{ duration: 1, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
      }}
    />
  );
}

function SuccessEffect() {
  const colors = ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      color: colors[i % colors.length],
      delay: Math.random() * 0.3,
      size: 6 + Math.random() * 10,
    };
  });

  return (
    <div style={{ position: 'relative', width: 0, height: 0 }}>
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </div>
  );
}

function ErrorEffect() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.3, 0] }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#ef4444',
        pointerEvents: 'none',
        zIndex: 90,
      }}
    />
  );
}

export default function FeedbackOverlay({ type, onDone }) {
  // type: 'success' | 'error' | null
  return (
    <AnimatePresence onExitComplete={onDone}>
      {type === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 80,
          }}
        >
          <SuccessEffect />
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1], rotate: [-20, 5, 0] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: '#22c55e',
              textShadow: '0 4px 20px rgba(34,197,94,0.4)',
            }}
          >
            {S.feedback.success}
          </motion.div>
        </motion.div>
      )}

      {type === 'error' && <ErrorEffect key="error" />}
    </AnimatePresence>
  );
}
