import { motion } from 'framer-motion';
import { getVarColor, PALETTE } from '../utils/colors';
import { spring } from '../utils/animations';

/**
 * A single piece of an expression - can be a number, variable, or operator
 * Each piece is independently draggable
 */
export default function Piece({
  data,
  onDragStart,
  onDragEnd,
  onDrag,
  isDraggable = true,
  showSign = true,
  layoutId,
  nodeRef,
  enableLayout = true,
  plain = false,
}) {
  const { type, value, name, sign } = data;
  const isImplicitMul = type === 'operator' && value === '*';

  // Determine display content
  let displayContent = '';
  let color = PALETTE.number;
  let fontSize = '2.6rem';

  if (type === 'number') {
    displayContent = String(value);
    color = PALETTE.number;
  } else if (type === 'variable') {
    const powerMatch = String(name || '').match(/^([A-Za-z]+)\^([0-9]+)$/);
    if (powerMatch) {
      displayContent = (
        <>
          <span>{powerMatch[1]}</span>
          <sup
            style={{
              fontSize: '0.62em',
              lineHeight: 1,
              marginLeft: '1px',
              top: '-0.45em',
              position: 'relative',
            }}
          >
            {powerMatch[2]}
          </sup>
        </>
      );
      color = getVarColor(powerMatch[1]);
    } else {
      displayContent = name;
      color = getVarColor(name);
    }
  } else if (type === 'operator') {
    displayContent = value === '*' ? '' : value;
    color = '#6b7280';
    fontSize = '2.2rem';
  } else if (type === 'paren') {
    displayContent = value;
    color = '#9ca3af';
    fontSize = '3rem';
  }

  const displaySign = sign === '-' ? '−' : '+';

  return (
    <motion.span
      layout={enableLayout}
      layoutId={enableLayout ? (layoutId || data.id) : undefined}
      ref={nodeRef}
      className="piece"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        cursor: isDraggable ? 'grab' : 'default',
        fontSize,
        fontWeight: 800,
        lineHeight: 1.2,
        position: 'relative',
        touchAction: 'none',
        padding: plain ? 0 : '6px 8px',
        borderRadius: plain ? 0 : '10px',
        margin: plain ? 0 : '0 2px',
        background: plain ? 'transparent' : (isDraggable ? 'rgba(255,255,255,0.3)' : 'transparent'),
        transition: 'background 0.2s',
        ...(isImplicitMul
          ? {
              padding: 0,
              margin: 0,
              minWidth: 0,
            }
          : {}),
      }}
      initial={{ scale: 1 }}
      whileHover={
        isDraggable && !plain
          ? {
              scale: 1.1,
              background: 'rgba(255,255,255,0.6)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }
          : undefined
      }
      whileDrag={{
        scale: 1.2,
        zIndex: 5000,
        background: plain ? 'transparent' : 'rgba(255,255,255,0.9)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        cursor: 'grabbing',
      }}
      drag={isDraggable}
      dragSnapToOrigin
      dragElastic={0.2}
      dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
      transition={spring}
    >
      {showSign && sign && type !== 'operator' && type !== 'paren' && (
        <motion.span
          key={sign}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            color: sign === '-' ? '#ef4444' : '#22c55e',
            marginRight: '4px',
            fontWeight: 900,
            fontSize: '2rem',
            minWidth: '22px',
            textAlign: 'center',
            display: 'inline-block',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          {displaySign}
        </motion.span>
      )}

      <span
        style={{
          color,
          textShadow:
            type === 'variable' ? `0 0 28px ${color}40` : 'none',
          fontStyle: type === 'variable' ? 'italic' : 'normal',
          fontVariantNumeric: type === 'number' ? 'tabular-nums' : 'normal',
        }}
      >
        {displayContent}
      </span>
    </motion.span>
  );
}
