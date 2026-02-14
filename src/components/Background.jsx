import { motion } from 'framer-motion';

const shapes = [
  { x: '10%', y: '15%', size: 60, color: '#a855f7', delay: 0, duration: 8 },
  { x: '80%', y: '10%', size: 40, color: '#3b82f6', delay: 1, duration: 10 },
  { x: '20%', y: '80%', size: 50, color: '#14b8a6', delay: 2, duration: 9 },
  { x: '70%', y: '75%', size: 35, color: '#f97316', delay: 0.5, duration: 11 },
  { x: '50%', y: '5%', size: 45, color: '#ef4444', delay: 1.5, duration: 7 },
  { x: '90%', y: '50%', size: 30, color: '#eab308', delay: 3, duration: 12 },
  { x: '5%', y: '50%', size: 55, color: '#ec4899', delay: 2.5, duration: 8.5 },
];

const mathSymbols = ['+', '−', '×', '÷', '=', 'x', 'y', '%'];

export default function Background() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: i % 2 === 0 ? '50%' : '30%',
            background: `${s.color}12`,
            border: `2px solid ${s.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${s.size * 0.5}px`,
            color: `${s.color}25`,
            fontWeight: 900,
          }}
          animate={{
            y: [0, -20, 0, 15, 0],
            x: [0, 10, 0, -10, 0],
            rotate: [0, 10, 0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: s.duration,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        >
          {mathSymbols[i % mathSymbols.length]}
        </motion.div>
      ))}
    </div>
  );
}
