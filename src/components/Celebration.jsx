import { motion } from 'framer-motion';
import { S } from '../utils/strings';

function Confetti() {
  const colors = ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 2,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    duration: 2 + Math.random() * 3,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 60 }}>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', rotate: p.rotation, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 1.5,
            borderRadius: '2px',
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

export default function Celebration({ onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 70,
      }}
    >
      <Confetti />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ fontSize: '5rem', marginBottom: '16px' }}
      >
        🎉
      </motion.div>

      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          fontSize: '2.2rem',
          fontWeight: 900,
          color: 'white',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          marginBottom: '12px',
        }}
      >
        {S.feedback.levelComplete}
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          fontSize: '1.2rem',
          color: 'rgba(255,255,255,0.85)',
          marginBottom: '32px',
        }}
      >
        {S.feedback.awesome}
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onContinue}
        style={{
          padding: '16px 48px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          color: 'white',
          fontSize: '1.3rem',
          fontWeight: 800,
          boxShadow: '0 8px 32px rgba(139,92,246,0.4)',
          zIndex: 80,
        }}
      >
        {S.exercise.backToMenu}
      </motion.button>
    </motion.div>
  );
}
