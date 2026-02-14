import { motion, AnimatePresence } from 'framer-motion';

/**
 * Beautiful error animation component
 * Shows animated popup when user makes an illegal move
 */
export default function ErrorAnimation({ show, message, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.3, y: -50 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            padding: '32px 48px',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(238, 90, 111, 0.4), 0 0 0 1px rgba(255,255,255,0.2) inset',
            maxWidth: '500px',
            width: '90%',
          }}
          onClick={onClose}
        >
          {/* Shake animation for the icon */}
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
            }}
            transition={{
              duration: 0.6,
              ease: 'easeInOut',
            }}
            style={{
              fontSize: '4rem',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            ⚠️
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              color: 'white',
              textAlign: 'center',
              marginBottom: '12px',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            Так нельзя!
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.95)',
              textAlign: 'center',
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            {message}
          </motion.p>

          {/* Ripple effect */}
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '3px solid white',
              pointerEvents: 'none',
            }}
          />

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              marginTop: '20px',
              padding: '12px 32px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'block',
              margin: '20px auto 0',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            Понятно
          </motion.button>
        </motion.div>
      )}

      {/* Backdrop */}
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}
    </AnimatePresence>
  );
}
