import { motion } from 'framer-motion';

/**
 * Drop zone for equation sides. Minimal styling -- no heavy borders.
 * Only shows visual feedback when a term is being dragged near it.
 */
export default function DropZone({ side, isActive, children }) {
  return (
    <motion.div
      className="dropzone"
      data-side={side}
      animate={{
        backgroundColor: isActive
          ? 'rgba(139,92,246,0.10)'
          : 'rgba(139,92,246,0.0)',
      }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '6px',
        padding: '16px 20px',
        minWidth: '100px',
        minHeight: '60px',
        borderRadius: '16px',
        position: 'relative',
      }}
    >
      {/* Subtle glow when active */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '18px',
            border: '2px dashed rgba(139,92,246,0.35)',
            boxShadow: '0 0 20px rgba(139,92,246,0.12)',
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
