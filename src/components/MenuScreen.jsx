import { motion } from 'framer-motion';
import { S } from '../utils/strings';
import { cardVariants, staggerChildren, spring } from '../utils/animations';

export default function MenuScreen({ onSelectModule }) {
  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        padding: '40px 20px',
        overflow: 'auto',
        gap: '24px',
      }}
      initial="initial"
      animate="animate"
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ textAlign: 'center', marginBottom: '8px' }}
      >
        <motion.h1
          style={{
            fontSize: 'clamp(2rem, 6vw, 3.2rem)',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6, #a855f7)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.2,
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          {S.appTitle}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: '1.1rem',
            color: '#6b7280',
            fontWeight: 600,
            marginTop: '8px',
          }}
        >
          {S.appSubtitle}
        </motion.p>
      </motion.div>

      {/* Module cards */}
      <motion.div
        variants={staggerChildren}
        initial="initial"
        animate="animate"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '660px',
        }}
      >
        {S.modules.map((mod, i) => (
          <motion.button
            key={mod.id}
            variants={cardVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => onSelectModule(mod.id)}
            transition={{ ...spring, delay: i * 0.08 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '24px',
              borderRadius: 'var(--card-radius)',
              background: 'var(--card-bg)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'var(--card-shadow)',
              textAlign: 'left',
              border: `3px solid ${mod.color}20`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Colored accent stripe */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${mod.color}, ${mod.color}80)`,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.8rem' }}>{mod.icon}</span>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: mod.color,
                }}
              >
                {mod.title}
              </h3>
            </div>

            <p
              style={{
                fontSize: '0.95rem',
                color: '#6b7280',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {mod.description}
            </p>

            {/* Play indicator */}
            <motion.div
              style={{
                alignSelf: 'flex-end',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: `${mod.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                color: mod.color,
                fontWeight: 900,
              }}
              whileHover={{
                background: mod.color,
                color: 'white',
                scale: 1.1,
              }}
            >
              ▶
            </motion.div>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
