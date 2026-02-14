import { motion, AnimatePresence } from 'framer-motion';

/**
 * Hint system that appears after several wrong attempts
 */
export default function HintSystem({ show, hint, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(2px)',
              zIndex: 500,
            }}
          />

          {/* Hint bubble */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            style={{
              position: 'fixed',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 501,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px 32px',
              borderRadius: '20px',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255,255,255,0.2) inset',
              maxWidth: '500px',
              width: '90%',
            }}
          >
            {/* Light bulb icon with pulse animation */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '3rem',
                filter: 'drop-shadow(0 4px 8px rgba(255,255,255,0.3))',
              }}
            >
              💡
            </motion.div>

            <motion.h4
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'white',
                textAlign: 'center',
                marginTop: '12px',
                marginBottom: '12px',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              Подсказка
            </motion.h4>

            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: '1.05rem',
                color: 'rgba(255,255,255,0.95)',
                textAlign: 'center',
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              {hint}
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{
                scale: 1.05,
                background: 'rgba(255,255,255,0.25)',
              }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                marginTop: '16px',
                padding: '10px 28px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'block',
                margin: '16px auto 0',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              Понял!
            </motion.button>

            {/* Sparkle decorations */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 180],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                  fontSize: '1.2rem',
                  pointerEvents: 'none',
                }}
              >
                ✨
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
