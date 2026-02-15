import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Piece from './Piece';
import ErrorAnimation from './ErrorAnimation';
import HintSystem from './HintSystem';
import { piece as makePiece } from '../engine/expressionModel';
import {
  combineTermsByPieceIds as combineExpressionTerms,
  analyzeSimplifyState as analyzeExpressionSimplify,
} from '../engine/simplifyEngine';
import { spring } from '../utils/animations';
import { getVarColor, PALETTE } from '../utils/colors';

/**
 * Renders equations/expressions with draggable numbers and variables only.
 * Operators remain fixed and every move is validated so invalid math cannot be built.
 */
export default function ExpressionView({ exercise, onAction, simplifyDifficulty = 'normal' }) {
  const [errorMessage, setErrorMessage] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [dragContext, setDragContext] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const equalsRef = useRef(null);
  const exprRef = useRef(null);
  const pieceRefs = useRef(new Map());
  const termRefs = useRef(new Map());

  const clearDragUiState = () => {
    setDragContext(null);
    setDragPreview(null);
  };

  const handlePieceDragStart = (piece) => {
    if (exercise.expr.type === 'expression' && isMovablePiece(piece)) {
      const leadId = getExpressionTermLeadId(exercise.expr.pieces || [], piece.id);
      if (!leadId) return;
      setDragContext({
        pieceId: leadId,
        kind: 'expressionTerm',
      });
      setDragPreview(null);
      return;
    }

    if (exercise.expr.type !== 'equation' || !isMovablePiece(piece)) return;
    const from = findPieceSide(exercise.expr, piece.id);
    if (!from.side || from.index < 0) return;
    const source = from.side === 'left' ? exercise.expr.left?.[0]?.pieces || [] : exercise.expr.right?.[0]?.pieces || [];
    const moveMeta = resolveEquationMove(source, from.index);
    if (!moveMeta) return;

    const previewTermPieces = clonePieceRange(source, moveMeta.moveRange);

    setDragContext({
      pieceId: piece.id,
      fromSide: from.side,
      isMul: moveMeta.moveType === 'mul',
      moveRange: moveMeta.moveRange,
      termSignPieceId: moveMeta.leadingPieceId,
      termPreviewPieces: previewTermPieces,
      operationTarget: moveMeta.operationTarget || null,
    });
    setDragPreview({
      pieceId: piece.id,
      fromSide: from.side,
      toSide: from.side,
      isMul: moveMeta.moveType === 'mul',
      crossed: false,
      operationTarget: null,
      dragPoint: null,
    });
  };

  const handlePieceDrag = (event, info) => {
    const point = info.point;

    if (exercise.expr.type !== 'equation' || !dragContext) return;

    const leftRect = leftRef.current?.getBoundingClientRect();
    const rightRect = rightRef.current?.getBoundingClientRect();
    const equalsRect = equalsRef.current?.getBoundingClientRect();
    const toSide = getPreviewSideFromPoint(point, dragContext.fromSide, leftRect, rightRect, equalsRect);
    const crossed = toSide !== dragContext.fromSide;
    const operationTarget = dragContext.isMul && crossed
      ? dragContext.operationTarget
      : null;

    setDragPreview((prev) => {
      if (
        prev &&
        prev.pieceId === dragContext.pieceId &&
        prev.fromSide === dragContext.fromSide &&
        prev.toSide === toSide &&
        prev.isMul === dragContext.isMul &&
        prev.crossed === crossed &&
        prev.operationTarget === operationTarget &&
        prev.dragPoint?.x === point.x &&
        prev.dragPoint?.y === point.y
      ) {
        return prev;
      }

      return {
        pieceId: dragContext.pieceId,
        fromSide: dragContext.fromSide,
        toSide,
        isMul: dragContext.isMul,
        crossed,
        operationTarget,
        dragPoint: { x: point.x, y: point.y },
      };
    });
  };

  const handlePieceDragEnd = (event, info, piece) => {
    if (!isMovablePiece(piece)) return;

    const point = info.point;
    if (exercise.expr.type === 'equation') {
      const leftRect = leftRef.current?.getBoundingClientRect();
      const rightRect = rightRef.current?.getBoundingClientRect();
      const equalsRect = equalsRef.current?.getBoundingClientRect();

      const from = findPieceSide(exercise.expr, piece.id);
      if (!from.side || from.index < 0) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      const previewSide = dragPreview?.pieceId === piece.id ? dragPreview.toSide : null;
      const directSide = getPreviewSideFromPoint(point, from.side, leftRect, rightRect, equalsRect);
      const toSide = !previewSide || previewSide === from.side ? directSide : previewSide;

      // Same-side drop: try expand or factor out
      if (!toSide || toSide === from.side) {
        const targetPieceId = findPieceAtPoint(point, piece.id, pieceRefs.current);
        if (targetPieceId) {
          const sameSideResult = trySameSideEquationOp(exercise.expr, from.side, piece.id, targetPieceId);
          if (sameSideResult) {
            const normalized = maybeNormalizeNegativeTarget(sameSideResult, exercise.targetVar);
            const solved = isIsolateSolved(normalized, exercise.targetVar);
            registerValidMove(solved);
            onAction({ type: 'expressionUpdate', expr: normalized, solved });
            clearDragUiState();
            return;
          }
        }
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      const source = from.side === 'left' ? exercise.expr.left?.[0]?.pieces || [] : exercise.expr.right?.[0]?.pieces || [];
      const moveMeta = resolveEquationMove(source, from.index);
      if (!moveMeta) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      // Block moving the target variable across the equals sign
      const otherSide = from.side === 'left' ? exercise.expr.right?.[0]?.pieces || [] : exercise.expr.left?.[0]?.pieces || [];
      if (exercise.targetVar && moveContainsTargetVar(source, otherSide, moveMeta, exercise.targetVar)) {
        registerIllegalMove('Мы ищем значение этой переменной! Её нужно оставить на месте. Перенеси другой элемент.');
        clearDragUiState();
        return;
      }

      const operationTarget = moveMeta.moveType === 'mul' && from.side !== toSide
        ? moveMeta.operationTarget
        : null;

      const updated = applyEquationMove(exercise.expr, piece.id, toSide, {
        operationTarget,
        targetVar: exercise.targetVar,
        moveMeta,
      });
      if (!updated) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      const normalized = maybeNormalizeNegativeTarget(updated, exercise.targetVar);
      const solved = isIsolateSolved(normalized, exercise.targetVar);
      registerValidMove(solved);
      onAction({ type: 'expressionUpdate', expr: normalized, solved });
      clearDragUiState();
      return;
    }

    if (exercise.expr.type === 'expression') {
      const exprRect = exprRef.current?.getBoundingClientRect();
      if (!isPointInRect(point, exprRect)) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      const sourceLeadId =
        dragContext?.kind === 'expressionTerm'
          ? dragContext.pieceId
          : getExpressionTermLeadId(exercise.expr.pieces || [], piece.id);
      if (!sourceLeadId) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      let targetLeadId = findPieceAtPoint(point, sourceLeadId, termRefs.current);
      if (!targetLeadId) {
        const targetPieceId = findPieceAtPoint(point, sourceLeadId, pieceRefs.current);
        targetLeadId = getExpressionTermLeadId(exercise.expr.pieces || [], targetPieceId);
      }

      if (!targetLeadId) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      if (!targetLeadId || targetLeadId === sourceLeadId) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      const updated = combineExpressionTerms(exercise.expr, sourceLeadId, targetLeadId, {
        difficulty: simplifyDifficulty,
      });
      if (!updated) {
        registerIllegalMove();
        clearDragUiState();
        return;
      }

      const solved = analyzeExpressionSimplify(updated, exercise.expected, {
        difficulty: simplifyDifficulty,
      }).solved;
      registerValidMove(solved);
      onAction({ type: 'expressionUpdate', expr: updated, solved });
      clearDragUiState();
      return;
    }

    registerIllegalMove();
    clearDragUiState();
  };

  const registerIllegalMove = (message = null) => {
    const next = wrongAttempts + 1;
    setWrongAttempts(next);
    setErrorMessage(message || randomErrorMessage());
    if (next >= 3) {
      setShowHint(true);
    }
  };

  const registerValidMove = (solved) => {
    const next = moveCount + 1;
    setMoveCount(next);
    if (!solved && next >= 6) {
      setShowHint(true);
    }
  };

  const hintText = useMemo(() => {
    if (exercise.hint) return exercise.hint;
    if (exercise.module === 'isolateVariable') {
      return `Тебе нужно выразить переменную "${exercise.targetVar}". Перетаскивай блоки через "=": в сумме переносится целый член, а в одиночном произведении — отдельные множители. Ещё можно раскрыть скобки (перетащи множитель на скобки) или вынести общий множитель (перетащи переменную на такую же в другом слагаемом).`;
    }
    if (exercise.module === 'simplifyExpression') {
      if (simplifyDifficulty === 'hard') {
        return 'Сложный режим: объединяй только полностью подобные члены и доводи выражение до канонического несократимого вида.';
      }
      return 'Перетаскивай целые члены друг на друга, чтобы объединять только подобные элементы.';
    }
    return 'Подумай о правиле, которое делает выражение короче, не нарушая математику.';
  }, [exercise.hint, exercise.module, exercise.targetVar, simplifyDifficulty]);

  if (exercise.expr.type === 'equation') {
    const leftPieces = sanitizeDisplaySidePieces(exercise.expr.left[0]?.pieces || []);
    const rightPieces = sanitizeDisplaySidePieces(exercise.expr.right[0]?.pieces || []);
    const leftMovableContext = buildMovableBlockContext(leftPieces);
    const rightMovableContext = buildMovableBlockContext(rightPieces);
    const additivePreviewPieces =
      dragPreview?.crossed && !dragPreview.isMul
        ? flipPreviewTermSign(dragContext?.termPreviewPieces)
        : dragContext?.termPreviewPieces || null;
    const leftPreview = buildSidePreview('left', dragPreview, dragContext?.termPreviewPieces, additivePreviewPieces);
    const rightPreview = buildSidePreview('right', dragPreview, dragContext?.termPreviewPieces, additivePreviewPieces);

    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            padding: '32px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <motion.div
            ref={leftRef}
            style={dropStyle('rgba(168, 85, 247, 0.05)', 'rgba(168, 85, 247, 0.3)')}
          >
            {renderEquationSide({
              pieces: leftPieces,
              onDragStart: handlePieceDragStart,
              onDrag: handlePieceDrag,
              onDragEnd: handlePieceDragEnd,
              pieceRefs,
              preview: leftPreview,
              movableContext: leftMovableContext,
            })}
          </motion.div>

          <motion.span
            ref={equalsRef}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              fontSize: '3.5rem',
              fontWeight: 900,
              color: '#6366f1',
              textShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            =
          </motion.span>

          <motion.div
            ref={rightRef}
            style={dropStyle('rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.3)')}
          >
            {renderEquationSide({
              pieces: rightPieces,
              onDragStart: handlePieceDragStart,
              onDrag: handlePieceDrag,
              onDragEnd: handlePieceDragEnd,
              pieceRefs,
              preview: rightPreview,
              movableContext: rightMovableContext,
            })}
          </motion.div>
        </div>
        <ErrorAnimation show={!!errorMessage} message={errorMessage} onClose={() => setErrorMessage(null)} />
        <HintSystem
          show={showHint}
          hint={hintText}
          onClose={() => {
            setShowHint(false);
            setWrongAttempts(0);
            setMoveCount(0);
          }}
        />
      </>
    );
  }

  if (exercise.expr.type === 'expression') {
    const pieces = exercise.expr.pieces || [];
    const expressionMovableContext = buildExpressionTermContext(pieces);

    return (
      <>
        <motion.div
          ref={exprRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4px',
            padding: '32px 48px',
            minHeight: '120px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(20px)',
            border: '2px dashed rgba(59, 130, 246, 0.3)',
          }}
        >
          {renderSideAsTerms(
            pieces,
            handlePieceDragStart,
            handlePieceDrag,
            handlePieceDragEnd,
            pieceRefs,
            {
              draggablePieceIds: expressionMovableContext.draggablePieceIds,
              blockVisualByPieceId: expressionMovableContext.blockVisualByPieceId,
              termRefs,
            }
          )}
        </motion.div>

        <ErrorAnimation show={!!errorMessage} message={errorMessage} onClose={() => setErrorMessage(null)} />
        <HintSystem
          show={showHint}
          hint={hintText}
          onClose={() => {
            setShowHint(false);
            setWrongAttempts(0);
            setMoveCount(0);
          }}
        />
      </>
    );
  }

  return null;
}

function renderEquationSide({
  pieces,
  onDragStart,
  onDrag,
  onDragEnd,
  pieceRefs,
  preview = null,
  movableContext = null,
  hidePieceIds = null,
  hideSignPieceId = null,
}) {
  const draggablePieceIds = movableContext?.draggablePieceIds || null;
  const blockVisualByPieceId = movableContext?.blockVisualByPieceId || null;

  if (preview?.kind === 'mul' && preview.activeOperation === 'den' && preview.termPieces?.length) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          minWidth: '100px',
        }}
      >
        <motion.div
          animate={{ y: -6 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}
        >
          {renderSideAsTerms(
            pieces,
            onDragStart,
            onDrag,
            onDragEnd,
            pieceRefs,
            {
              hideSignPieceId,
              hidePieceIds,
              draggablePieceIds,
              blockVisualByPieceId,
            }
          )}
        </motion.div>
        <motion.div
          initial={{ scaleX: 0.25, opacity: 0.2 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            height: '3px',
            width: '100%',
            minWidth: '76px',
            borderRadius: '999px',
            background: 'rgba(30,27,58,0.78)',
            boxShadow: '0 0 12px rgba(30,27,58,0.25)',
          }}
        />
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <StaticTermPreview pieces={preview.termPieces} moveType="mul" />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', position: 'relative' }}>
      {renderSideAsTerms(
        pieces,
        onDragStart,
        onDrag,
        onDragEnd,
        pieceRefs,
        {
          hideSignPieceId,
          hidePieceIds,
          draggablePieceIds,
          blockVisualByPieceId,
        }
      )}
      {renderInlineSidePreview(preview)}
    </div>
  );
}

function renderSideAsTerms(pieces, onDragStart, onDrag, onDragEnd, pieceRefs, options = {}) {
  const ranges = getTopLevelTermRanges(pieces);
  if (ranges.length === 0) {
    return renderPieceList(pieces, onDragStart, onDrag, onDragEnd, pieceRefs, options);
  }

  const nodes = [];
  ranges.forEach((range, termIdx) => {
    const rawTerm = pieces.slice(range.start, range.end + 1);
    const term = options.hidePieceIds ? rawTerm.filter((p) => !options.hidePieceIds.has(p.id)) : rawTerm;
    if (term.length === 0) return;

    const leadIdx = term.findIndex(isMovablePiece);
    const lead = leadIdx >= 0 ? term[leadIdx] : null;
    const sign = lead?.sign === '-' ? '-' : '+';
    const showSign = !!lead && (termIdx > 0 || sign === '-');

    if (showSign) {
      nodes.push(
        <SignToken
          key={`term-sign-${lead?.id || termIdx}`}
          sign={sign}
          hidden={lead?.id === options.hideSignPieceId}
        />
      );
    }

    const normalizedTerm = leadIdx < 0
      ? term
      : term.map((piece, idx) => (idx === leadIdx ? { ...piece, sign: '' } : piece));

    const termBlockVisual = resolveWholeTermBlockVisual(term, options.blockVisualByPieceId || null);
    const termContent = renderTermWithFraction(
      normalizedTerm,
      onDragStart,
      onDrag,
      onDragEnd,
      pieceRefs,
      {
        ...options,
        hideSignPieceId: null,
        hidePieceIds: null,
        suppressBlockShell: !!termBlockVisual,
        forceNonDraggable: !!termBlockVisual,
      }
    );
    const termLeadPiece = lead || null;
    const termDraggable =
      !!termBlockVisual &&
      !!termLeadPiece &&
      (!options.draggablePieceIds || options.draggablePieceIds.has(termLeadPiece.id));

    nodes.push(
      <motion.span
        key={`term-${lead?.id || termIdx}`}
        ref={(node) => {
          if (!options.termRefs || !termLeadPiece?.id) return;
          setPieceRef(options.termRefs, termLeadPiece.id, node);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          ...(termBlockVisual
            ? {
                ...getUnifiedBlockShellStyle(termBlockVisual.moveType),
                cursor: termDraggable ? 'grab' : 'default',
              }
            : {}),
        }}
        whileHover={
          termDraggable
            ? {
                scale: 1.04,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }
            : undefined
        }
        whileDrag={
          termDraggable
            ? {
                scale: 1.08,
                zIndex: 5000,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                cursor: 'grabbing',
              }
            : undefined
        }
        drag={termDraggable}
        dragSnapToOrigin
        dragElastic={0.2}
        dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
        onDragStart={termDraggable && onDragStart ? () => onDragStart(termLeadPiece) : undefined}
        onDrag={termDraggable ? onDrag : undefined}
        onDragEnd={termDraggable && onDragEnd ? (e, info) => onDragEnd(e, info, termLeadPiece) : undefined}
        transition={spring}
      >
        {termContent}
      </motion.span>
    );
  });

  return nodes;
}

function resolveWholeTermBlockVisual(termPieces, blockVisualByPieceId) {
  if (!blockVisualByPieceId || !Array.isArray(termPieces) || termPieces.length === 0) return null;

  const withVisual = termPieces.map((piece) => blockVisualByPieceId.get(piece.id)).filter(Boolean);
  if (withVisual.length !== termPieces.length) return null;

  const moveType = withVisual[0]?.moveType;
  if (!moveType) return null;
  if (withVisual.some((v) => v.moveType !== moveType)) return null;

  const startCount = withVisual.filter((v) => v.isStart).length;
  const endCount = withVisual.filter((v) => v.isEnd).length;
  if (startCount !== 1 || endCount !== 1) return null;

  const first = withVisual[0];
  const last = withVisual[withVisual.length - 1];
  if (!first.isStart || !last.isEnd) return null;

  return { moveType };
}

function renderTermWithFraction(pieces, onDragStart, onDrag, onDragEnd, pieceRefs, options = {}) {
  const factors = parseTopLevelFactorsWithRoles(pieces);
  if (!factors || !factors.some((f) => f.role === 'den')) {
    return renderPieceList(pieces, onDragStart, onDrag, onDragEnd, pieceRefs, options);
  }

  const numeratorGroups = [];
  const denominatorGroups = [];
  factors.forEach((factor) => {
    const group = clonePieceRange(pieces, factor);
    if (factor.role === 'den') denominatorGroups.push(group);
    else numeratorGroups.push(group);
  });

  const numeratorPieces = buildProductPiecesFromGroups(numeratorGroups);
  const denominatorPieces = buildProductPiecesFromGroups(denominatorGroups);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        minWidth: '56px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
        {renderPieceList(numeratorPieces, onDragStart, onDrag, onDragEnd, pieceRefs, options)}
      </div>
      <div
        style={{
          height: '3px',
          width: '100%',
          minWidth: '52px',
          borderRadius: '999px',
          background: 'rgba(30,27,58,0.7)',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
        {renderPieceList(denominatorPieces, onDragStart, onDrag, onDragEnd, pieceRefs, options)}
      </div>
    </div>
  );
}

function buildProductPiecesFromGroups(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return [makePiece({ type: 'number', value: 1, sign: '' })];
  }
  const out = [];
  appendFactorProduct(out, groups);
  return out;
}

function renderInlineSidePreview(preview) {
  if (!preview) return null;

  if (preview.kind === 'mul' && preview.activeOperation === 'mul' && preview.termPieces?.length) {
    return (
      <motion.div
        initial={{ x: -8, opacity: 0.45 }}
        animate={{ x: 0, opacity: [0.55, 0.95, 0.55] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: '6px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            color: '#6b7280',
            lineHeight: 1,
            marginRight: '2px',
          }}
        >
          ·
        </span>
        <StaticTermPreview pieces={preview.termPieces} moveType="mul" />
      </motion.div>
    );
  }

  if (preview.kind === 'add' && Array.isArray(preview.termPieces) && preview.termPieces.length > 0) {
    return (
      <motion.div
        initial={{ x: -8, opacity: 0.45 }}
        animate={{ x: 0, opacity: [0.55, 0.95, 0.55] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: '6px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <AdditiveResultPreview pieces={preview.termPieces} />
      </motion.div>
    );
  }

  return null;
}

function StaticTermPreview({ pieces, moveType = 'add' }) {
  if (!Array.isArray(pieces) || pieces.length === 0) return null;

  return (
    <span
      style={{
        ...getUnifiedBlockShellStyle(moveType),
        cursor: 'default',
        margin: 0,
        opacity: 0.95,
      }}
    >
      {renderTermWithFraction(
        pieces,
        null,
        null,
        () => {},
        new Map(),
        {
          forceNonDraggable: true,
          suppressBlockShell: true,
        }
      )}
    </span>
  );
}

function AdditiveResultPreview({ pieces }) {
  if (!Array.isArray(pieces) || pieces.length === 0) return null;

  const leading = pieces.find(isMovablePiece);
  if (!leading) return null;

  const leadingSign = leading.sign === '-' ? '-' : '+';
  const normalizedPieces = pieces.map((piece) => {
    if (!isMovablePiece(piece)) return piece;
    if (piece.id !== leading.id) return piece;
    return { ...piece, sign: '' };
  });

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <SignToken sign={leadingSign} />
      <span
        style={{
          ...getUnifiedBlockShellStyle('add'),
          margin: 0,
          padding: '5px 8px',
          opacity: 0.95,
        }}
      >
        {normalizedPieces.map((piece, idx) => {
          if (piece.type === 'operator') {
            const symbol = piece.value === '*' ? '·' : piece.value === '/' ? '÷' : piece.value;
            return (
              <span
                key={`${piece.id || piece.value}-${idx}`}
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: '#6b7280',
                  lineHeight: 1,
                  margin: '0 2px',
                }}
              >
                {symbol}
              </span>
            );
          }

          if (piece.type === 'paren') {
            return (
              <span
                key={`${piece.id || piece.value}-${idx}`}
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: '#9ca3af',
                  lineHeight: 1,
                }}
              >
                {piece.value}
              </span>
            );
          }

          if (!isMovablePiece(piece)) return null;
          return (
            <span
              key={`${piece.id || piece.name || piece.value}-${idx}`}
              style={{
                fontSize: '2.6rem',
                fontWeight: 800,
                lineHeight: 1.2,
                color: piece.type === 'variable' ? getVarColor(piece.name) : PALETTE.number,
                fontStyle: piece.type === 'variable' ? 'italic' : 'normal',
                textShadow: piece.type === 'variable' ? `0 0 28px ${getVarColor(piece.name)}40` : 'none',
              }}
            >
              {piece.type === 'number' ? String(piece.value) : piece.name}
            </span>
          );
        })}
      </span>
    </span>
  );
}

function renderPieceList(pieces, onDragStart, onDrag, onDragEnd, pieceRefs, options = {}) {
  const hideSignPieceId = options.hideSignPieceId || null;
  const hidePieceIds = options.hidePieceIds || null;
  const draggablePieceIds = options.draggablePieceIds || null;
  const blockVisualByPieceId = options.suppressBlockShell ? null : (options.blockVisualByPieceId || null);
  const forceNonDraggable = !!options.forceNonDraggable;
  const visiblePieces = hidePieceIds ? pieces.filter((p) => !hidePieceIds.has(p.id)) : pieces;
  const nodes = [];

  for (let idx = 0; idx < visiblePieces.length; idx += 1) {
    const p = visiblePieces[idx];
    const visual = blockVisualByPieceId?.get(p.id) || null;
    const startsBlock = !!visual?.isStart;

    if (startsBlock) {
      const blockPieces = [];
      let endIdx = idx;
      for (let j = idx; j < visiblePieces.length; j += 1) {
        blockPieces.push(visiblePieces[j]);
        endIdx = j;
        const v = blockVisualByPieceId?.get(visiblePieces[j].id);
        if (v?.isEnd) break;
      }

      const leadPiece = blockPieces.find(isMovablePiece) || null;
      const blockDraggable =
        !!leadPiece &&
        !forceNonDraggable &&
        (!draggablePieceIds || draggablePieceIds.has(leadPiece.id));

      nodes.push(
        <motion.span
          key={`block-${p.id}`}
          style={{
            ...getUnifiedBlockShellStyle(visual.moveType),
            cursor: blockDraggable ? 'grab' : 'default',
          }}
          whileHover={
            blockDraggable
              ? {
                  scale: 1.04,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }
              : undefined
          }
          whileDrag={
            blockDraggable
              ? {
                  scale: 1.08,
                  zIndex: 5000,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  cursor: 'grabbing',
                }
              : undefined
          }
          drag={blockDraggable}
          dragSnapToOrigin
          dragElastic={0.2}
          dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
          onDragStart={blockDraggable && onDragStart ? () => onDragStart(leadPiece) : undefined}
          onDrag={blockDraggable ? onDrag : undefined}
          onDragEnd={blockDraggable && onDragEnd ? (e, info) => onDragEnd(e, info, leadPiece) : undefined}
          transition={spring}
        >
          {blockPieces.map((bp, localIdx) => {
            const absoluteIdx = idx + localIdx;
            return (
              <span key={bp.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {shouldShowSign(visiblePieces, absoluteIdx) && (
                  <SignToken sign={bp.sign} hidden={bp.id === hideSignPieceId} />
                )}
                <Piece
                  data={bp}
                  onDragStart={undefined}
                  onDrag={undefined}
                  onDragEnd={undefined}
                  showSign={false}
                  isDraggable={false}
                  plain
                  enableLayout={false}
                  nodeRef={(node) => setPieceRef(pieceRefs, bp.id, node)}
                />
              </span>
            );
          })}
        </motion.span>
      );

      idx = endIdx;
      continue;
    }

    nodes.push(
      <span
        key={p.id}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {shouldShowSign(visiblePieces, idx) && (
          <SignToken sign={p.sign} hidden={p.id === hideSignPieceId} />
        )}
        <Piece
          data={p}
          onDragStart={onDragStart ? () => onDragStart(p) : undefined}
          onDrag={onDrag}
          onDragEnd={(e, info) => onDragEnd(e, info, p)}
          showSign={false}
          isDraggable={!forceNonDraggable && isMovablePiece(p) && (!draggablePieceIds || draggablePieceIds.has(p.id))}
          plain={forceNonDraggable}
          enableLayout={false}
          nodeRef={(node) => setPieceRef(pieceRefs, p.id, node)}
        />
      </span>
    );
  }

  return nodes;
}

function getUnifiedBlockShellStyle(moveType) {
  const isMul = moveType === 'mul';
  const border = isMul ? 'rgba(16,185,129,0.46)' : 'rgba(99,102,241,0.42)';
  const background = isMul ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)';

  return {
    display: 'inline-flex',
    alignItems: 'center',
    border: `2px solid ${border}`,
    borderRadius: '10px',
    background,
    padding: '6px 8px',
    margin: '0 2px',
  };
}

function SignToken({ sign, hidden = false }) {
  if (sign !== '+' && sign !== '-') return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: sign === '-' ? '#ef4444' : '#22c55e',
        fontWeight: 900,
        fontSize: '2rem',
        lineHeight: 1,
        minWidth: '20px',
        marginRight: '2px',
        pointerEvents: 'none',
        userSelect: 'none',
        visibility: hidden ? 'hidden' : 'visible',
      }}
    >
      {sign === '-' ? '−' : '+'}
    </span>
  );
}

function splitTopLevelDivision(pieces) {
  // Only render as a stacked fraction when the whole side is one multiplicative term.
  // For expressions like r/3 + s, keep inline precedence instead of showing r/(3+s).
  if (countTopLevelTerms(pieces) !== 1) {
    return null;
  }

  let balance = 0;
  for (let i = 0; i < pieces.length; i++) {
    const token = pieces[i];
    if (token.type === 'paren' && token.value === '(') balance += 1;
    if (token.type === 'paren' && token.value === ')') balance -= 1;
    if (token.type === 'operator' && token.value === '/' && balance === 0) {
      return {
        numerator: pieces.slice(0, i),
        denominator: pieces.slice(i + 1),
      };
    }
  }
  return null;
}

function GhostPiece({ piece, slot }) {
  if (!piece || !isMovablePiece(piece)) return null;
  const content = piece.type === 'number' ? String(piece.value) : piece.name;
  const signColor = piece.sign === '-' ? '#ef4444' : '#22c55e';
  const varColor = piece.type === 'variable' ? '#2563eb' : '#111827';
  const showSign = (slot === 'mul' || slot === 'den') && piece.sign === '-';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: slot === 'den' ? '4px 8px' : '2px 6px',
        borderRadius: '10px',
        border: slot === 'den' ? '2px dashed rgba(16,185,129,0.42)' : '2px dashed rgba(99,102,241,0.35)',
        background: slot === 'den' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)',
      }}
    >
      {showSign && (
        <span
          style={{
            color: signColor,
            fontWeight: 900,
            fontSize: '1.15rem',
            lineHeight: 1,
          }}
        >
          −
        </span>
      )}
      <span
        style={{
          fontSize: '1.35rem',
          fontWeight: 800,
          color: varColor,
          fontStyle: piece.type === 'variable' ? 'italic' : 'normal',
        }}
      >
        {content}
      </span>
    </div>
  );
}

function GhostTerm({ pieces, mode = 'add', slot = 'add' }) {
  if (!Array.isArray(pieces) || pieces.length === 0) return null;

  const leading = pieces.find(isMovablePiece);
  const leadingSign = leading?.sign === '-' ? '-' : '+';
  const isMul = mode === 'mul';
  const shellBorder = slot === 'den' ? 'rgba(16,185,129,0.42)' : 'rgba(99,102,241,0.35)';
  const shellBackground = slot === 'den' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.08)';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isMul ? '3px 6px' : '2px 4px',
        borderRadius: '10px',
        background: shellBackground,
        border: isMul ? `2px dashed ${shellBorder}` : 'none',
      }}
    >
      {!isMul && <SignToken sign={leadingSign} />}
      {pieces.map((piece, idx) => {
        if (piece.type === 'operator') {
          const symbol = piece.value === '*' ? '·' : piece.value === '/' ? '÷' : piece.value;
          return (
            <span
              key={`${piece.id || piece.value}-${idx}`}
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#6b7280',
                lineHeight: 1,
              }}
            >
              {symbol}
            </span>
          );
        }

        if (piece.type === 'paren') {
          return (
            <span
              key={`${piece.id || piece.value}-${idx}`}
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#9ca3af',
                lineHeight: 1,
              }}
            >
              {piece.value}
            </span>
          );
        }

        if (!isMovablePiece(piece)) return null;
        const ghostPiece = isMul ? { ...piece } : { ...piece, sign: '' };
        return <GhostPiece key={`${piece.id || piece.name || piece.value}-${idx}`} piece={ghostPiece} slot={isMul ? slot : 'add'} />;
      })}
    </div>
  );
}

function dropStyle(bg, border) {
  return {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    minHeight: '80px',
    minWidth: '120px',
    padding: '16px',
    borderRadius: '16px',
    background: bg,
    border: `2px dashed ${border}`,
    position: 'relative',
    overflow: 'visible',
  };
}

function randomErrorMessage() {
  const messages = [
    'Эта операция нарушает математическое правило.',
    'Так выражение становится некорректным.',
    'Попробуй другой перенос: этот шаг нельзя выполнить.',
    'Нельзя получить верное выражение таким движением.',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function isMovablePiece(piece) {
  return piece?.type === 'number' || piece?.type === 'variable';
}

/**
 * Check if moving this range should be blocked to protect the target variable.
 *
 * Rules:
 * - Multiplicative moves: block only if the factor IS the bare target variable
 *   (single piece). Paren groups like (x+b) in denominator are allowed.
 * - Additive moves: block if the term contains the target AND the target does NOT
 *   appear on the other side. When target is on both sides, moving a target-
 *   containing term is valid algebra (consolidating like terms).
 */
function moveContainsTargetVar(source, otherSide, moveMeta, targetVar) {
  if (!targetVar || !moveMeta?.moveRange) return false;
  const { start, end } = moveMeta.moveRange;

  if (moveMeta.moveType === 'mul') {
    if (start === end) {
      const p = source[start];
      if (p?.type === 'variable' && p.name === targetVar) return true;
    }
    return false;
  }

  let targetInRange = false;
  for (let i = start; i <= end; i += 1) {
    if (source[i]?.type === 'variable' && source[i].name === targetVar) {
      targetInRange = true;
      break;
    }
  }
  if (!targetInRange) return false;

  if (Array.isArray(otherSide) && otherSide.some((p) => p?.type === 'variable' && p.name === targetVar)) {
    return false;
  }

  return true;
}

function shouldShowSign(pieces, index) {
  const current = pieces[index];
  if (!current || !isMovablePiece(current)) return false;
  if (!current.sign || current.sign === '') return false;
  if (current.sign === '-') return true;
  if (index === 0) return false;
  const prev = pieces[index - 1];
  if (!prev) return false;
  if (prev.type === 'operator') return false;
  if (prev.type === 'paren' && prev.value === '(') return false;
  return true;
}

function isPointInRect(point, rect) {
  if (!rect) return false;
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function setPieceRef(map, id, node) {
  const store = resolvePieceRefStore(map);
  if (!store) return;
  if (node) {
    store.set(id, node);
  } else {
    store.delete(id);
  }
}

function resolvePieceRefStore(candidate) {
  if (!candidate) return null;
  if (candidate instanceof Map) return candidate;
  if (candidate.current instanceof Map) return candidate.current;
  return null;
}

function findPieceAtPoint(point, excludeId, map) {
  if (!map) return null;
  for (const [id, node] of map.entries()) {
    if (id === excludeId || !node) continue;
    const rect = node.getBoundingClientRect();
    if (isPointInRect(point, rect)) return id;
  }
  return null;
}

function getPreviewSideFromPoint(point, fromSide, leftRect, rightRect, equalsRect = null) {
  if (!point) return fromSide;

  if (isPointInRect(point, leftRect)) return 'left';
  if (isPointInRect(point, rightRect)) return 'right';

  const threshold = getEqualsCrossThreshold(leftRect, rightRect, equalsRect);
  if (typeof threshold !== 'number') return fromSide;

  return point.x < threshold ? 'left' : 'right';
}

function getEqualsCrossThreshold(leftRect, rightRect, equalsRect = null) {
  if (equalsRect) return equalsRect.left + equalsRect.width / 2;
  if (leftRect && rightRect) return (leftRect.right + rightRect.left) / 2;
  if (leftRect) return leftRect.right;
  if (rightRect) return rightRect.left;
  return null;
}

function buildSidePreview(side, dragPreview, multiplicativePreviewPieces, additivePreviewPieces) {
  if (!dragPreview?.crossed || dragPreview.toSide !== side) return null;

  if (dragPreview.isMul) {
    if (!multiplicativePreviewPieces || multiplicativePreviewPieces.length === 0) return null;
    return {
      kind: 'mul',
      termPieces: multiplicativePreviewPieces,
      activeOperation: dragPreview.operationTarget,
    };
  }

  if (!additivePreviewPieces || additivePreviewPieces.length === 0) return null;

  return {
    kind: 'add',
    termPieces: additivePreviewPieces,
  };
}

function countTopLevelTerms(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return 0;

  let depth = 0;
  let terms = 0;

  for (let i = 0; i < pieces.length; i++) {
    const token = pieces[i];

    if (token.type === 'paren') {
      if (token.value === '(') depth += 1;
      if (token.value === ')') depth -= 1;
      continue;
    }

    if (depth !== 0 || !isMovablePiece(token)) continue;

    const prev = pieces[i - 1];
    const continuesCurrentTerm =
      prev?.type === 'operator' && (prev.value === '*' || prev.value === '/');

    if (terms === 0) {
      terms = 1;
      continue;
    }

    if (!continuesCurrentTerm && (token.sign === '+' || token.sign === '-')) {
      terms += 1;
    }
  }

  // Expressions with no top-level movable token (e.g. "(a+b)/c") still represent one term.
  if (terms === 0) return 1;
  return terms;
}

function getTopLevelTermRanges(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return [];

  const ranges = [];
  const seen = new Set();

  for (let i = 0; i < pieces.length; i += 1) {
    const token = pieces[i];
    if (!isMovablePiece(token)) continue;
    if (getPieceDepth(pieces, i) !== 0) continue;

    const range = getAdditiveTermRangeForIndex(pieces, i);
    if (!range) continue;
    const key = `${range.start}:${range.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ranges.push(range);
  }

  if (ranges.length === 0) {
    return [{ start: 0, end: pieces.length - 1 }];
  }

  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

function hasTopLevelMulOrDivOperator(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return false;
  for (let i = 0; i < pieces.length; i += 1) {
    if (!isTopLevelMulDivOperator(pieces, i)) continue;
    return true;
  }
  return false;
}

function buildMovableBlockContext(pieces) {
  const draggablePieceIds = new Set();
  const blockVisualByPieceId = new Map();

  if (!Array.isArray(pieces) || pieces.length === 0) {
    return { draggablePieceIds, blockVisualByPieceId };
  }

  const seenBlocks = new Set();
  for (let i = 0; i < pieces.length; i += 1) {
    const token = pieces[i];
    if (!isMovablePiece(token)) continue;

    const moveMeta = resolveEquationMove(pieces, i);
    if (!moveMeta) continue;
    draggablePieceIds.add(token.id);

    const blockKey = `${moveMeta.moveType}:${moveMeta.moveRange.start}:${moveMeta.moveRange.end}`;
    if (seenBlocks.has(blockKey)) continue;
    seenBlocks.add(blockKey);

    for (let j = moveMeta.moveRange.start; j <= moveMeta.moveRange.end; j += 1) {
      const blockToken = pieces[j];
      if (!blockToken?.id) continue;
      blockVisualByPieceId.set(blockToken.id, {
        moveType: moveMeta.moveType,
        isStart: j === moveMeta.moveRange.start,
        isEnd: j === moveMeta.moveRange.end,
      });
    }
  }

  return { draggablePieceIds, blockVisualByPieceId };
}

function buildExpressionTermContext(pieces) {
  const draggablePieceIds = new Set();
  const blockVisualByPieceId = new Map();
  const ranges = getTopLevelTermRanges(pieces);

  ranges.forEach((range) => {
    const leadId = findLeadingMovablePieceId(pieces, range);
    if (!leadId) return;
    draggablePieceIds.add(leadId);

    for (let i = range.start; i <= range.end; i += 1) {
      const token = pieces[i];
      if (!token?.id) continue;
      blockVisualByPieceId.set(token.id, {
        moveType: 'add',
        isStart: i === range.start,
        isEnd: i === range.end,
      });
    }
  });

  return { draggablePieceIds, blockVisualByPieceId };
}

function getExpressionTermLeadId(pieces, pieceId) {
  if (!Array.isArray(pieces) || !pieceId) return null;
  const ranges = getTopLevelTermRanges(pieces);

  for (const range of ranges) {
    for (let i = range.start; i <= range.end; i += 1) {
      if (pieces[i]?.id !== pieceId) continue;
      return findLeadingMovablePieceId(pieces, range);
    }
  }

  return null;
}

function clonePieceRange(pieces, range) {
  if (!range) return [];
  return pieces.slice(range.start, range.end + 1).map((piece) => ({ ...piece }));
}

function flipPreviewTermSign(termPieces) {
  if (!Array.isArray(termPieces) || termPieces.length === 0) return null;
  return negateExpressionPieces(termPieces);
}

function resolveEquationMove(source, index) {
  if (!Array.isArray(source) || !isMovablePiece(source[index])) return null;

  const topLevelTerms = countTopLevelTerms(source);
  if (topLevelTerms > 1) {
    const moveRange = getAdditiveTermRangeForIndex(source, index);
    if (!moveRange) return null;
    return {
      moveType: 'add',
      moveRange,
      leadingPieceId: findLeadingMovablePieceId(source, moveRange),
      operationTarget: null,
    };
  }

  if (!hasTopLevelMulOrDivOperator(source)) {
    const moveRange = getAdditiveTermRangeForIndex(source, index);
    if (!moveRange) return null;
    return {
      moveType: 'add',
      moveRange,
      leadingPieceId: findLeadingMovablePieceId(source, moveRange),
      operationTarget: null,
    };
  }

  const moveRange = resolveTopLevelFactorForIndex(source, index);
  if (!moveRange) return null;
  const operatorBefore = getTopLevelOperatorBeforeRange(source, moveRange);
  const operationTarget = operatorBefore === '/' ? 'mul' : 'den';

  return {
    moveType: 'mul',
    moveRange,
    leadingPieceId: findLeadingMovablePieceId(source, moveRange),
    operationTarget,
  };
}

function getAdditiveTermRangeForIndex(source, index) {
  const anchor = resolveTopLevelFactorForIndex(source, index);
  if (!anchor) return null;

  let start = anchor.start;
  let end = anchor.end;

  while (start - 1 >= 0 && isTopLevelMulDivOperator(source, start - 1)) {
    const leftRange = resolveTopLevelFactorForIndex(source, start - 2);
    if (!leftRange) break;
    start = leftRange.start;
  }

  while (end + 1 < source.length && isTopLevelMulDivOperator(source, end + 1)) {
    const rightRange = resolveTopLevelFactorForIndex(source, end + 2);
    if (!rightRange) break;
    end = rightRange.end;
  }

  return { start, end };
}

function resolveTopLevelFactorForIndex(source, index) {
  if (!Array.isArray(source) || index < 0 || index >= source.length) return null;

  const topLevelParenRange = findTopLevelParenRangeContainingIndex(source, index);
  if (topLevelParenRange) return topLevelParenRange;

  if (getPieceDepth(source, index) !== 0) return null;
  if (!isMovablePiece(source[index])) return null;
  return { start: index, end: index };
}

function getTopLevelOperatorBeforeRange(source, range) {
  const opIndex = range?.start - 1;
  if (typeof opIndex !== 'number' || opIndex < 0) return null;
  if (!isTopLevelMulDivOperator(source, opIndex)) return null;
  return source[opIndex].value;
}

function isTopLevelMulDivOperator(source, index) {
  if (!Array.isArray(source) || index < 0 || index >= source.length) return false;
  const token = source[index];
  if (token?.type !== 'operator') return false;
  if (token.value !== '*' && token.value !== '/') return false;
  return getPieceDepth(source, index) === 0;
}

function findTopLevelParenRangeContainingIndex(source, targetIndex) {
  if (!Array.isArray(source) || targetIndex < 0 || targetIndex >= source.length) return null;

  const tokenAtTarget = source[targetIndex];
  if (tokenAtTarget?.type !== 'paren' && getPieceDepth(source, targetIndex) === 0) {
    return null;
  }

  let depth = 0;
  const stack = [];

  for (let i = 0; i < source.length; i += 1) {
    const token = source[i];
    if (token?.type === 'paren' && token.value === '(') {
      stack.push({ index: i, depthBefore: depth });
      depth += 1;
      continue;
    }
    if (token?.type === 'paren' && token.value === ')') {
      depth -= 1;
      const open = stack.pop();
      if (!open) return null;
      if (open.depthBefore === 0 && open.index <= targetIndex && targetIndex <= i) {
        return { start: open.index, end: i };
      }
    }
  }

  return null;
}

function parseTopLevelFactorsWithRoles(source) {
  if (!Array.isArray(source) || source.length === 0) return null;

  const factors = [];
  let i = 0;

  while (i < source.length) {
    const range = resolveTopLevelFactorForIndex(source, i);
    if (!range || range.start !== i) return null;

    const opBefore = factors.length === 0 ? null : source[i - 1]?.value;
    const role = opBefore === '/' ? 'den' : 'num';
    factors.push({ start: range.start, end: range.end, role });

    i = range.end + 1;
    if (i >= source.length) break;
    if (!isTopLevelMulDivOperator(source, i)) return null;
    i += 1;
  }

  return factors;
}

function buildSideFromFactorRoles(source, factors, skipIndex) {
  const numerator = [];
  const denominator = [];

  factors.forEach((factor, idx) => {
    if (idx === skipIndex) return;
    const group = clonePieceRange(source, factor);
    if (factor.role === 'den') {
      denominator.push(group);
    } else {
      numerator.push(group);
    }
  });

  return buildFactorExpression(numerator, denominator);
}

function buildFactorExpression(numeratorGroups, denominatorGroups) {
  const result = [];

  if (numeratorGroups.length === 0) {
    result.push(makePiece({ type: 'number', value: 1, sign: '+' }));
  } else {
    appendFactorProduct(result, numeratorGroups);
  }

  denominatorGroups.forEach((group) => {
    result.push(makePiece({ type: 'operator', value: '/', sign: '+' }));
    result.push(...group.map((piece) => ({ ...piece })));
  });

  return result;
}

function appendFactorProduct(out, factorGroups) {
  factorGroups.forEach((group, idx) => {
    if (idx > 0) {
      out.push(makePiece({ type: 'operator', value: '*', sign: '+' }));
    }
    out.push(...group.map((piece) => ({ ...piece })));
  });
}

function findLeadingMovablePieceId(source, range) {
  for (let i = range.start; i <= range.end; i += 1) {
    if (isMovablePiece(source[i])) return source[i].id;
  }
  return null;
}

function getPieceDepth(pieces, index) {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    const token = pieces[i];
    if (token?.type === 'paren' && token.value === '(') depth += 1;
    if (token?.type === 'paren' && token.value === ')') depth -= 1;
  }
  return depth;
}

function applyEquationMove(expr, pieceId, toSide, options = {}) {
  const updated = JSON.parse(JSON.stringify(expr));
  const left = updated.left?.[0]?.pieces || [];
  const right = updated.right?.[0]?.pieces || [];
  const from = findPieceSide(updated, pieceId);
  if (!from.side || from.index < 0) return null;
  if (from.side === toSide) return null;

  const source = from.side === 'left' ? left : right;
  const target = toSide === 'left' ? left : right;
  const moveMeta = options.moveMeta || resolveEquationMove(source, from.index);
  if (!moveMeta) return null;

  if (moveMeta.moveType === 'mul') {
    const operationTarget = options.operationTarget || moveMeta.operationTarget;
    if (operationTarget !== 'den' && operationTarget !== 'mul') return null;
    if (!moveFactorAcross(source, target, moveMeta.moveRange, operationTarget)) return null;
  } else {
    if (!moveAdditiveTermAcross(source, target, moveMeta.moveRange)) return null;
  }

  const normalizedLeft = normalizeSide(left);
  const normalizedRight = normalizeSide(right);
  if (!isValidPieceSequence(normalizedLeft) || !isValidPieceSequence(normalizedRight)) return null;

  updated.left[0].pieces = normalizedLeft;
  updated.right[0].pieces = normalizedRight;
  return updated;
}

function moveAdditiveTermAcross(source, target, range) {
  if (!range || range.start < 0 || range.end >= source.length || range.start > range.end) return false;
  const movedTerm = source.splice(range.start, range.end - range.start + 1).map((piece) => ({ ...piece }));
  if (!movedTerm.length) return false;
  target.push(...negateExpressionPieces(movedTerm));
  return true;
}

function moveFactorAcross(source, target, moveRange, operationTarget) {
  if (!moveRange || operationTarget == null) return false;

  const factors = parseTopLevelFactorsWithRoles(source);
  if (!factors?.length) return false;

  const factorIndex = factors.findIndex((factor) => factor.start === moveRange.start && factor.end === moveRange.end);
  if (factorIndex < 0) return false;

  const movedFactor = clonePieceRange(source, moveRange);
  if (!movedFactor.length) return false;

  const rebuiltSource = buildSideFromFactorRoles(source, factors, factorIndex);
  if (!rebuiltSource.length) return false;
  source.splice(0, source.length, ...rebuiltSource.map((piece) => ({ ...piece })));

  if (!target.length) {
    target.push(makePiece({ type: 'number', value: 0, sign: '+' }));
  }

  const targetWrapped = wrapSideForWholeOperation(target);
  target.splice(0, target.length, ...targetWrapped);
  target.push(makePiece({ type: 'operator', value: operationTarget === 'mul' ? '*' : '/', sign: '+' }));
  target.push(...movedFactor.map((piece) => ({ ...piece })));
  return true;
}

function wrapSideForWholeOperation(sidePieces) {
  if (sidePieces.length === 1 && isMovablePiece(sidePieces[0])) {
    return sidePieces.map((p) => ({ ...p }));
  }
  return [
    makePiece({ type: 'paren', value: '(' }),
    ...sidePieces.map((p) => ({ ...p })),
    makePiece({ type: 'paren', value: ')' }),
  ];
}

// ============================================================================
// Same-side equation operations: Expand (distribute) and Factor out
// ============================================================================

/**
 * Try a same-side operation (expand product or factor out variable).
 * Returns updated equation or null.
 */
function trySameSideEquationOp(expr, side, dragPieceId, targetPieceId) {
  const updated = JSON.parse(JSON.stringify(expr));
  const pieces = side === 'left' ? updated.left?.[0]?.pieces || [] : updated.right?.[0]?.pieces || [];

  // Try expand: drag a factor onto a paren group (or vice versa) in the same multiplicative term
  const expandResult = tryExpandProduct(pieces, dragPieceId, targetPieceId);
  if (expandResult) {
    if (side === 'left') {
      updated.left[0].pieces = normalizeSide(expandResult);
    } else {
      updated.right[0].pieces = normalizeSide(expandResult);
    }
    return updated;
  }

  // Try factor out: drag a variable onto the same variable in another additive term
  const factorResult = tryFactorOut(pieces, dragPieceId, targetPieceId);
  if (factorResult) {
    if (side === 'left') {
      updated.left[0].pieces = normalizeSide(factorResult);
    } else {
      updated.right[0].pieces = normalizeSide(factorResult);
    }
    return updated;
  }

  return null;
}

/**
 * Expand / distribute: A * (B + C) → A*B + A*C
 *
 * The user drags a factor and drops it onto a parenthesized group (or vice versa).
 * Both must be top-level factors in the same multiplicative term.
 *
 * Returns new pieces array or null.
 */
function tryExpandProduct(pieces, dragPieceId, targetPieceId) {
  // Find which pieces were involved
  const dragIdx = pieces.findIndex((p) => p.id === dragPieceId);
  const targetIdx = pieces.findIndex((p) => p.id === targetPieceId);
  if (dragIdx < 0 || targetIdx < 0) return null;

  // Both must be in the same additive term
  const dragTermRange = getAdditiveTermRangeForIndex(pieces, dragIdx);
  const targetTermRange = getAdditiveTermRangeForIndex(pieces, targetIdx);
  if (!dragTermRange || !targetTermRange) return null;
  if (dragTermRange.start !== targetTermRange.start || dragTermRange.end !== targetTermRange.end) return null;

  // Extract the term pieces
  const termPieces = pieces.slice(dragTermRange.start, dragTermRange.end + 1);
  const termOffset = dragTermRange.start;

  // Parse factors within this term
  const factors = parseTopLevelFactorsWithRoles(termPieces);
  if (!factors || factors.length < 2) return null;

  // Identify which factor is the paren group (to expand into) and which is "the rest"
  const dragFactor = findFactorContainingIndex(factors, dragIdx - termOffset);
  const targetFactor = findFactorContainingIndex(factors, targetIdx - termOffset);
  if (!dragFactor || !targetFactor || dragFactor === targetFactor) return null;

  // One of them must be a paren group with inner additive terms
  let parenFactor = null;
  let otherFactorIndices = [];
  const dragIsParen = isParenGroupFactor(termPieces, dragFactor);
  const targetIsParen = isParenGroupFactor(termPieces, targetFactor);

  if (targetIsParen && targetFactor.role !== 'den') {
    parenFactor = targetFactor;
  } else if (dragIsParen && dragFactor.role !== 'den') {
    parenFactor = dragFactor;
  } else {
    return null; // Neither is a valid (numerator) paren group
  }

  // Get inner terms of the paren group (without outer parens)
  const innerPieces = termPieces.slice(parenFactor.start + 1, parenFactor.end);
  const innerTermRanges = getTopLevelTermRanges(innerPieces);
  if (innerTermRanges.length < 2) return null; // Must have at least 2 terms to distribute

  // Collect all OTHER factors (not the paren group)
  const otherFactors = factors.filter((f) => f !== parenFactor);
  if (otherFactors.length === 0) return null;

  // Build the "coefficient" pieces from other factors (preserving their mul/div relationships)
  const coeffPieces = buildFactorProductPieces(termPieces, otherFactors);

  // For each inner term, create: coeff * innerTerm
  const resultPieces = [];
  for (let t = 0; t < innerTermRanges.length; t += 1) {
    const range = innerTermRanges[t];
    const innerTerm = innerPieces.slice(range.start, range.end + 1).map((p) => ({ ...p }));

    // Determine the additive sign of this inner term
    const leadPiece = innerTerm.find(isMovablePiece);
    const innerSign = leadPiece?.sign === '-' ? '-' : '+';

    // Clone coefficient pieces
    const coeffClone = coeffPieces.map((p) => ({ ...p, id: makePiece(p).id }));

    // Set sign on first movable piece of coeff: combine coeff sign with inner term sign
    const coeffLead = coeffClone.find(isMovablePiece);
    if (coeffLead) {
      const coeffSign = coeffLead.sign === '-' ? '-' : '+';
      // Multiply signs: (+)(+)=+, (+)(-)=-, (-)(+)=-, (-)(-)=+
      coeffLead.sign = coeffSign === innerSign ? '+' : '-';
    }

    // Strip sign from inner term's leading piece (it's now carried by the coeff)
    if (leadPiece) {
      leadPiece.sign = '';
    }

    // Build: coeffClone * innerTerm (strip inner term sign since it's on coeff)
    if (t > 0 || resultPieces.length > 0) {
      // Already have pieces, the sign on coeffLead handles the addition
    }
    resultPieces.push(...coeffClone);
    resultPieces.push(makePiece({ type: 'operator', value: '*', sign: '+' }));
    resultPieces.push(...innerTerm);
  }

  if (!resultPieces.length) return null;

  // Rebuild the full side: replace the original term with expanded terms, keep other terms
  const before = pieces.slice(0, dragTermRange.start).map((p) => ({ ...p }));
  const after = pieces.slice(dragTermRange.end + 1).map((p) => ({ ...p }));
  const newPieces = [...before, ...resultPieces, ...after];

  if (!isValidPieceSequence(newPieces)) return null;
  return newPieces;
}

function findFactorContainingIndex(factors, localIndex) {
  for (const f of factors) {
    if (localIndex >= f.start && localIndex <= f.end) return f;
  }
  return null;
}

function isParenGroupFactor(termPieces, factor) {
  return (
    termPieces[factor.start]?.type === 'paren' &&
    termPieces[factor.start]?.value === '(' &&
    termPieces[factor.end]?.type === 'paren' &&
    termPieces[factor.end]?.value === ')'
  );
}

/**
 * Build a pieces array that represents the product of the given factors.
 * Preserves numerator/denominator roles.
 */
function buildFactorProductPieces(termPieces, factors) {
  const result = [];
  for (let i = 0; i < factors.length; i += 1) {
    const f = factors[i];
    const fPieces = termPieces.slice(f.start, f.end + 1).map((p) => ({ ...p }));
    if (i > 0) {
      const op = f.role === 'den' ? '/' : '*';
      result.push(makePiece({ type: 'operator', value: op, sign: '+' }));
    }
    result.push(...fPieces);
  }
  return result;
}

/**
 * Factor out common variable: A*x + B*x → (A+B)*x
 *
 * The user drags a variable from one additive term onto the same variable
 * in a different additive term. All terms containing that variable get factored.
 *
 * Returns new pieces array or null.
 */
function tryFactorOut(pieces, dragPieceId, targetPieceId) {
  const dragIdx = pieces.findIndex((p) => p.id === dragPieceId);
  const targetIdx = pieces.findIndex((p) => p.id === targetPieceId);
  if (dragIdx < 0 || targetIdx < 0) return null;

  const dragPiece = pieces[dragIdx];
  const targetPiece = pieces[targetIdx];

  // Both must be the same variable
  if (dragPiece.type !== 'variable' || targetPiece.type !== 'variable') return null;
  if (dragPiece.name !== targetPiece.name) return null;

  const commonVar = dragPiece.name;

  // They must be in different additive terms
  const dragTermRange = getAdditiveTermRangeForIndex(pieces, dragIdx);
  const targetTermRange = getAdditiveTermRangeForIndex(pieces, targetIdx);
  if (!dragTermRange || !targetTermRange) return null;
  if (dragTermRange.start === targetTermRange.start) return null; // Same term

  // Find ALL top-level additive terms that contain this variable as a factor
  const allTermRanges = getTopLevelTermRanges(pieces);
  const termsWithVar = [];
  const termsWithout = [];

  for (const range of allTermRanges) {
    const termPieces = pieces.slice(range.start, range.end + 1);
    const varInfo = extractVariableFactor(termPieces, commonVar);
    if (varInfo) {
      termsWithVar.push({ range, coeff: varInfo.coeffPieces, varSign: varInfo.varSign });
    } else {
      termsWithout.push(range);
    }
  }

  if (termsWithVar.length < 2) return null; // Need at least 2 terms to factor

  // Build the factored expression: (A + B + ...) * var
  // Where A, B are the coefficients from each term
  const innerPieces = [];
  for (let i = 0; i < termsWithVar.length; i += 1) {
    const { coeff } = termsWithVar[i];
    if (i > 0) {
      // The sign is already on the coeff's leading piece
    }
    innerPieces.push(...coeff.map((p) => ({ ...p, id: makePiece(p).id })));
  }

  // Determine overall sign for the factored term
  const leadCoeff = innerPieces.find(isMovablePiece);
  const factoredSign = leadCoeff?.sign === '-' ? '-' : '+';

  // Build: (innerPieces) * commonVar
  const factoredTerm = [];

  // If multiple coeff terms, wrap in parens; signs stay on inner pieces
  const innerTermCount = countTopLevelTerms(innerPieces);
  if (innerTermCount > 1) {
    factoredTerm.push(makePiece({ type: 'paren', value: '(' }));
    factoredTerm.push(...innerPieces);
    factoredTerm.push(makePiece({ type: 'paren', value: ')' }));
  } else {
    factoredTerm.push(...innerPieces);
  }

  factoredTerm.push(makePiece({ type: 'operator', value: '*', sign: '+' }));
  factoredTerm.push(makePiece({ type: 'variable', name: commonVar, sign: '' }));

  // Ensure the leading piece of factoredTerm has the right additive sign
  const factoredLead = factoredTerm.find(isMovablePiece);
  if (factoredLead && (!factoredLead.sign || factoredLead.sign === '')) {
    factoredLead.sign = '+';
  }

  // Rebuild: factoredTerm + remaining terms (those without the variable)
  const resultPieces = [...factoredTerm];
  for (const range of termsWithout) {
    resultPieces.push(...pieces.slice(range.start, range.end + 1).map((p) => ({ ...p })));
  }

  if (!isValidPieceSequence(resultPieces)) return null;
  return resultPieces;
}

/**
 * Extract the coefficient of a variable from a multiplicative term.
 * E.g., for term "3 * x" with commonVar "x", returns { coeffPieces: [3], varSign: '+' }
 * E.g., for term "-x" returns { coeffPieces: [-1], varSign: '-' }
 * Returns null if the variable is not a top-level factor in this term.
 */
function extractVariableFactor(termPieces, commonVar) {
  // Parse factors
  const factors = parseTopLevelFactorsWithRoles(termPieces);
  if (!factors) {
    // Might be a single variable
    if (termPieces.length === 1 && termPieces[0].type === 'variable' && termPieces[0].name === commonVar) {
      const sign = termPieces[0].sign === '-' ? '-' : '+';
      return {
        coeffPieces: [makePiece({ type: 'number', value: 1, sign })],
        varSign: sign,
      };
    }
    return null;
  }

  // Find the variable factor
  let varFactorIdx = -1;
  for (let i = 0; i < factors.length; i += 1) {
    const f = factors[i];
    if (f.start === f.end && termPieces[f.start].type === 'variable' && termPieces[f.start].name === commonVar) {
      varFactorIdx = i;
      break;
    }
  }
  if (varFactorIdx < 0) return null;

  // The variable must be in numerator position
  if (factors[varFactorIdx].role === 'den') return null;

  // Build coefficient from remaining factors
  const otherFactors = factors.filter((_, idx) => idx !== varFactorIdx);

  // Get the additive sign of the whole term (from the first movable piece)
  const leadPiece = termPieces.find(isMovablePiece);
  const termSign = leadPiece?.sign === '-' ? '-' : '+';

  if (otherFactors.length === 0) {
    return {
      coeffPieces: [makePiece({ type: 'number', value: 1, sign: termSign })],
      varSign: termSign,
    };
  }

  const coeffPieces = buildFactorProductPieces(termPieces, otherFactors);
  // Set the additive sign on the coefficient's leading piece
  const coeffLead = coeffPieces.find(isMovablePiece);
  if (coeffLead) {
    coeffLead.sign = termSign;
  }

  return { coeffPieces, varSign: termSign };
}

function normalizeSide(pieces) {
  const next = sanitizeDisplaySidePieces(pieces);
  while (next.length && next[0].type === 'operator') next.shift();
  while (next.length && next[next.length - 1].type === 'operator') next.pop();
  if (!next.length) {
    next.push(makePiece({ type: 'number', value: 0, sign: '+' }));
  }
  if (isMovablePiece(next[0]) && (!next[0].sign || next[0].sign === '')) {
    next[0].sign = '+';
  }
  return next;
}

function sanitizeDisplaySidePieces(pieces) {
  const next = pieces.map((p) => ({ ...p }));
  return stripRedundantAdditiveZeroTerms(next);
}

function stripRedundantAdditiveZeroTerms(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return pieces;

  const ranges = getTopLevelTermRanges(pieces);
  if (ranges.length <= 1) return pieces;

  const keepRanges = ranges.filter((range) => !isStandaloneZeroTerm(pieces, range));
  if (keepRanges.length === ranges.length) return pieces;

  if (keepRanges.length === 0) {
    return [makePiece({ type: 'number', value: 0, sign: '+' })];
  }

  const rebuilt = [];
  keepRanges.forEach((range) => {
    rebuilt.push(...pieces.slice(range.start, range.end + 1).map((piece) => ({ ...piece })));
  });

  const leadIndex = rebuilt.findIndex(isMovablePiece);
  if (leadIndex >= 0 && (!rebuilt[leadIndex].sign || rebuilt[leadIndex].sign === '')) {
    rebuilt[leadIndex].sign = '+';
  }

  return rebuilt;
}

function isStandaloneZeroTerm(pieces, range) {
  if (!range || range.start < 0 || range.end >= pieces.length) return false;
  const term = pieces.slice(range.start, range.end + 1);
  const compact = term.filter((token) => token.type !== 'paren');
  if (compact.length !== 1) return false;
  const only = compact[0];
  return only?.type === 'number' && Number(only.value) === 0;
}

function multiplyByNegative(sign) {
  if (sign === '-') return '+';
  return '-';
}

function findPieceSide(expr, pieceId) {
  const leftPieces = expr.left?.[0]?.pieces || [];
  const rightPieces = expr.right?.[0]?.pieces || [];
  const leftIndex = leftPieces.findIndex((p) => p.id === pieceId);
  if (leftIndex >= 0) return { side: 'left', index: leftIndex };
  const rightIndex = rightPieces.findIndex((p) => p.id === pieceId);
  if (rightIndex >= 0) return { side: 'right', index: rightIndex };
  return { side: null, index: -1 };
}

function isValidPieceSequence(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) return false;
  let balance = 0;
  let prev = 'start';

  for (const token of pieces) {
    if (isMovablePiece(token)) {
      if ((prev === 'operand' || prev === 'close') && token.sign !== '+' && token.sign !== '-') {
        return false;
      }
      prev = 'operand';
      continue;
    }

    if (token.type === 'operator') {
      if (token.value !== '*' && token.value !== '/') return false;
      if (prev !== 'operand' && prev !== 'close') return false;
      prev = 'operator';
      continue;
    }

    if (token.type === 'paren') {
      if (token.value === '(') {
        if (prev === 'operand' || prev === 'close') return false;
        balance += 1;
        prev = 'open';
        continue;
      }
      if (token.value === ')') {
        if (balance === 0) return false;
        if (prev !== 'operand' && prev !== 'close') return false;
        balance -= 1;
        prev = 'close';
        continue;
      }
    }

    return false;
  }

  if (balance !== 0) return false;
  if (prev === 'operator' || prev === 'open' || prev === 'start') return false;
  return true;
}

function maybeNormalizeNegativeTarget(expr, targetVar) {
  if (!targetVar || !expr?.left?.[0]?.pieces || !expr?.right?.[0]?.pieces) return expr;

  const left = expr.left[0].pieces;
  const right = expr.right[0].pieces;

  if (isNegativeIsolatedTarget(left, targetVar)) {
    const normalized = JSON.parse(JSON.stringify(expr));
    normalized.left[0].pieces[0].sign = '+';
    normalized.right[0].pieces = negateSidePieces(normalized.right[0].pieces);
    return normalized;
  }

  if (isNegativeIsolatedTarget(right, targetVar)) {
    const normalized = JSON.parse(JSON.stringify(expr));
    normalized.right[0].pieces[0].sign = '+';
    normalized.left[0].pieces = negateSidePieces(normalized.left[0].pieces);
    return normalized;
  }

  return expr;
}

function isNegativeIsolatedTarget(pieces, targetVar) {
  if (!Array.isArray(pieces) || pieces.length !== 1 || !targetVar) return false;
  const only = pieces[0];
  return isMovablePiece(only) && only.type === 'variable' && only.name === targetVar && only.sign === '-';
}

function negateSidePieces(pieces) {
  const division = splitTopLevelDivision(pieces);
  if (division) {
    const numerator = negateExpressionPieces(division.numerator);
    return [
      ...numerator,
      makePiece({ type: 'operator', value: '/', sign: '+' }),
      ...division.denominator.map((p) => ({ ...p })),
    ];
  }
  return negateExpressionPieces(pieces);
}

function negateExpressionPieces(pieces) {
  const cloned = pieces.map((p) => ({ ...p }));
  if (flipTopLevelTermSigns(cloned)) return cloned;

  const inner = unwrapSingleOuterParens(cloned);
  if (inner) {
    const negInner = negateExpressionPieces(inner.inner);
    return [inner.open, ...negInner, inner.close];
  }

  const wrapped = wrapSideForWholeOperation(cloned);
  return [
    makePiece({ type: 'number', value: 1, sign: '-' }),
    makePiece({ type: 'operator', value: '*', sign: '+' }),
    ...wrapped,
  ];
}

function flipTopLevelTermSigns(pieces) {
  let depth = 0;
  let flipped = false;
  let prevTopLevel = null;

  for (let i = 0; i < pieces.length; i += 1) {
    const token = pieces[i];
    if (token.type === 'paren') {
      if (token.value === '(') depth += 1;
      if (token.value === ')') depth -= 1;
      if (depth === 0) prevTopLevel = token;
      continue;
    }
    if (depth !== 0) continue;
    if (!isMovablePiece(token)) {
      prevTopLevel = token;
      continue;
    }

    const isAfterMulOrDiv =
      prevTopLevel?.type === 'operator' &&
      (prevTopLevel.value === '*' || prevTopLevel.value === '/');

    const startsAdditiveTerm = !isAfterMulOrDiv;
    if (startsAdditiveTerm) {
      const current = token.sign === '-' ? '-' : '+';
      token.sign = multiplyByNegative(current);
      flipped = true;
    }
    prevTopLevel = token;
  }

  return flipped;
}

function unwrapSingleOuterParens(pieces) {
  if (!Array.isArray(pieces) || pieces.length < 3) return null;
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  if (first?.type !== 'paren' || first.value !== '(' || last?.type !== 'paren' || last.value !== ')') {
    return null;
  }

  let depth = 0;
  for (let i = 0; i < pieces.length; i += 1) {
    const token = pieces[i];
    if (token.type === 'paren' && token.value === '(') depth += 1;
    if (token.type === 'paren' && token.value === ')') depth -= 1;
    if (depth === 0 && i < pieces.length - 1) return null;
  }

  return {
    open: { ...first },
    inner: pieces.slice(1, -1).map((p) => ({ ...p })),
    close: { ...last },
  };
}

function combineLikeTerms(expr, dragId, targetId) {
  const updated = JSON.parse(JSON.stringify(expr));
  const pieces = updated.pieces || [];
  const dragIndex = pieces.findIndex((p) => p.id === dragId);
  const targetIndex = pieces.findIndex((p) => p.id === targetId);
  if (dragIndex < 0 || targetIndex < 0) return null;

  const drag = pieces[dragIndex];
  const target = pieces[targetIndex];
  if (!isMovablePiece(drag) || !isMovablePiece(target)) return null;

  if (drag.type === 'number' && target.type === 'number') {
    if (isCoefficientNumber(pieces, dragIndex) || isCoefficientNumber(pieces, targetIndex)) return null;
    const merged = signedValue(drag) + signedValue(target);
    const [value, sign] = signedPair(merged);
    pieces[targetIndex] = { ...target, value, sign };
    pieces.splice(dragIndex, 1);
    if (!pieces.length) pieces.push(makePiece({ type: 'number', value: 0, sign: '+' }));
    if (!isValidPieceSequence(pieces)) return null;
    updated.pieces = pieces;
    return updated;
  }

  if (drag.type === 'variable' && target.type === 'variable') {
    if (drag.name !== target.name) return null;

    const dragTerm = getVariableTerm(pieces, dragIndex);
    const targetTerm = getVariableTerm(pieces, targetIndex);
    if (!dragTerm || !targetTerm) return null;

    const total = dragTerm.coeff + targetTerm.coeff;
    const keep = { ...targetTerm };
    removeRange(pieces, dragTerm.start, dragTerm.end);
    if (dragTerm.start < keep.start) {
      const delta = dragTerm.end - dragTerm.start + 1;
      keep.start -= delta;
      keep.end -= delta;
    }

    if (total === 0) {
      removeRange(pieces, keep.start, keep.end);
      if (!pieces.length) pieces.push(makePiece({ type: 'number', value: 0, sign: '+' }));
      if (!isValidPieceSequence(pieces)) return null;
      updated.pieces = pieces;
      return updated;
    }

    const replacement = buildVariableTerm(total, keep.name);
    replaceRange(pieces, keep.start, keep.end, replacement);
    if (!isValidPieceSequence(pieces)) return null;
    updated.pieces = pieces;
    return updated;
  }

  return null;
}

function isCoefficientNumber(pieces, idx) {
  const prev = pieces[idx - 1];
  const next = pieces[idx + 1];
  return (
    (next?.type === 'operator' && next.value === '*') ||
    (prev?.type === 'operator' && prev.value === '*')
  );
}

function signedValue(piece) {
  const sign = piece.sign === '-' ? -1 : 1;
  return sign * piece.value;
}

function signedPair(value) {
  if (value < 0) return [Math.abs(value), '-'];
  return [value, '+'];
}

function getVariableTerm(pieces, varIndex) {
  const variable = pieces[varIndex];
  if (!variable || variable.type !== 'variable') return null;

  const beforeOp = pieces[varIndex - 1];
  const beforeNum = pieces[varIndex - 2];
  if (beforeOp?.type === 'operator' && beforeOp.value === '*' && beforeNum?.type === 'number') {
    return { name: variable.name, coeff: signedValue(beforeNum), start: varIndex - 2, end: varIndex };
  }

  const afterOp = pieces[varIndex + 1];
  const afterNum = pieces[varIndex + 2];
  if (afterOp?.type === 'operator' && afterOp.value === '*' && afterNum?.type === 'number') {
    const sign = variable.sign === '-' ? -1 : 1;
    const coeff = sign * signedValue(afterNum);
    return { name: variable.name, coeff, start: varIndex, end: varIndex + 2 };
  }

  const sign = variable.sign === '-' ? -1 : 1;
  return { name: variable.name, coeff: sign, start: varIndex, end: varIndex };
}

function buildVariableTerm(coeff, name) {
  const sign = coeff < 0 ? '-' : '+';
  const abs = Math.abs(coeff);
  if (abs === 1) {
    return [makePiece({ type: 'variable', name, sign })];
  }
  return [
    makePiece({ type: 'number', value: abs, sign }),
    makePiece({ type: 'operator', value: '*', sign: '+' }),
    makePiece({ type: 'variable', name, sign: '' }),
  ];
}

function removeRange(arr, start, end) {
  arr.splice(start, end - start + 1);
}

function replaceRange(arr, start, end, replacement) {
  arr.splice(start, end - start + 1, ...replacement);
}

function isIsolateSolved(expr, targetVar) {
  if (!targetVar) return false;
  const left = expr.left?.[0]?.pieces || [];
  const right = expr.right?.[0]?.pieces || [];
  if (!isValidPieceSequence(left) || !isValidPieceSequence(right)) return false;

  const leftSolved =
    left.length === 1 &&
    left[0].type === 'variable' &&
    left[0].name === targetVar &&
    left[0].sign !== '-' &&
    !right.some((p) => p.type === 'variable' && p.name === targetVar);

  if (leftSolved) return true;

  const rightSolved =
    right.length === 1 &&
    right[0].type === 'variable' &&
    right[0].name === targetVar &&
    right[0].sign !== '-' &&
    !left.some((p) => p.type === 'variable' && p.name === targetVar);

  return rightSolved;
}

function isSimplifySolved(expr, expected) {
  const actual = toLinearForm(expr.pieces || []);
  if (!actual) return false;

  if (typeof expected === 'string') {
    const v = parseInt(expected, 10);
    if (Number.isNaN(v)) return false;
    return Object.keys(actual.vars).length === 0 && actual.constant === v;
  }

  if (!Array.isArray(expected)) return false;
  const expectedForm = toLinearForm(expected);
  if (!expectedForm) return false;
  return linearFormsEqual(actual, expectedForm);
}

function toLinearForm(pieces) {
  if (!isValidPieceSequence(pieces)) return null;
  const vars = {};
  let constant = 0;
  let i = 0;

  while (i < pieces.length) {
    const current = pieces[i];
    if (!isMovablePiece(current)) return null;

    if (current.type === 'number') {
      const n = signedValue(current);
      const op = pieces[i + 1];
      const next = pieces[i + 2];
      if (op?.type === 'operator' && op.value === '*' && next?.type === 'variable') {
        vars[next.name] = (vars[next.name] || 0) + n;
        i += 3;
      } else if (op?.type === 'operator') {
        return null;
      } else {
        constant += n;
        i += 1;
      }
      continue;
    }

    if (current.type === 'variable') {
      const sign = current.sign === '-' ? -1 : 1;
      const op = pieces[i + 1];
      const next = pieces[i + 2];
      if (op?.type === 'operator' && op.value === '*' && next?.type === 'number') {
        vars[current.name] = (vars[current.name] || 0) + sign * signedValue(next);
        i += 3;
      } else if (op?.type === 'operator') {
        return null;
      } else {
        vars[current.name] = (vars[current.name] || 0) + sign;
        i += 1;
      }
      continue;
    }
  }

  Object.keys(vars).forEach((k) => {
    if (vars[k] === 0) delete vars[k];
  });
  return { vars, constant };
}

function linearFormsEqual(a, b) {
  if (a.constant !== b.constant) return false;
  const keysA = Object.keys(a.vars).sort();
  const keysB = Object.keys(b.vars).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    if (a.vars[keysA[i]] !== b.vars[keysA[i]]) return false;
  }
  return true;
}
