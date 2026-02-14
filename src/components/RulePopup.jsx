import { motion, AnimatePresence } from 'framer-motion';
import { getRuleTitle, getRuleExplanation, getRuleExample } from '../engine/rules';
import { getVarColor } from '../utils/colors';

export default function RulePopup({ ruleKey, isError, onClose }) {
  if (!ruleKey) return null;

  const title = getRuleTitle(ruleKey);
  const explanation = getRuleExplanation(ruleKey);
  const example = getRuleExample(ruleKey);

  return (
    <AnimatePresence>
      {ruleKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.7, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ fontSize: '3rem', marginBottom: '12px' }}
            >
              {isError ? '🚫' : '💡'}
            </motion.div>

            {/* Title */}
            <h3
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                marginBottom: '12px',
                color: isError ? '#ef4444' : '#7c3aed',
              }}
            >
              {title}
            </h3>

            {/* Explanation */}
            <p
              style={{
                fontSize: '1.1rem',
                lineHeight: 1.6,
                color: '#374151',
                marginBottom: example ? '20px' : '0',
              }}
            >
              {explanation}
            </p>

            {/* Mini example */}
            {example && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  background: '#f5f3ff',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#6b7280' }}>
                    {example.before}
                  </span>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ fontSize: '1.5rem' }}
                  >
                    →
                  </motion.span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#7c3aed' }}>
                    {example.after}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '0.9rem',
                    color: '#9ca3af',
                    fontWeight: 600,
                  }}
                >
                  {example.highlight}
                </div>
              </motion.div>
            )}

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                padding: '12px 36px',
                borderRadius: '14px',
                background: isError
                  ? 'linear-gradient(135deg, #ef4444, #f97316)'
                  : 'linear-gradient(135deg, #a855f7, #6366f1)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 700,
                boxShadow: isError
                  ? '0 4px 16px rgba(239,68,68,0.3)'
                  : '0 4px 16px rgba(139,92,246,0.3)',
              }}
            >
              Понятно!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
