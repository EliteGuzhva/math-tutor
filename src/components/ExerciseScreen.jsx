import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Equation from './Equation';
import MultiplicativeEquation from './MultiplicativeEquation';
import FractionExercise from './FractionExercise';
import ExpressionView from './ExpressionView';
import FeedbackOverlay from './FeedbackOverlay';
import RulePopup from './RulePopup';
import Celebration from './Celebration';
import { generateExerciseSet as generateOldExerciseSet } from '../engine/exerciseGenerator';
import { generateNextExercise } from '../engine/newExerciseGenerator';
import { validate } from '../engine/validator';
import { S } from '../utils/strings';
import { fadeInUp, spring } from '../utils/animations';

const OLD_EXERCISES_PER_MODULE = 8;

const promptForModule = {
  moveMultiplicative: S.exercise.promptMultMove,
  simplify: S.exercise.promptSimplify,
  crossMultiply: S.exercise.promptCross,
  combineFractions: S.exercise.promptCombine,
};

// Module 1: additive (drag across =, sign flips)
const ADDITIVE_MODULE = 'moveAdditive';
// Module 2: multiplicative (separate coeff/var, num/den drop targets)
const MULTIPLICATIVE_MODULE = 'moveMultiplicative';
// Modules rendered by FractionExercise (interactive fraction work)
const FRACTION_MODULES = new Set(['simplify', 'crossMultiply', 'combineFractions']);

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export default function ExerciseScreen({ moduleId, onBack }) {
  const isNewModule = moduleId === 'isolateVariable' || moduleId === 'simplifyExpression';

  // Difficulty level 1-4 for new modules
  const [difficultyLevel, setDifficultyLevel] = useState(1);

  // For new modules: single current exercise generated on the fly
  const [exercise, setExercise] = useState(() => {
    if (isNewModule) {
      return generateNextExercise(moduleId, 1);
    }
    return generateOldExerciseSet(moduleId, OLD_EXERCISES_PER_MODULE);
  });

  // For legacy modules: array-based
  const [exercises, setExercises] = useState(() =>
    isNewModule ? null : generateOldExerciseSet(moduleId, OLD_EXERCISES_PER_MODULE)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [rulePopup, setRulePopup] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);

  // For legacy modules, exercise comes from array
  const currentExercise = isNewModule ? exercise : (exercises ? exercises[currentIdx] : null);

  // Dynamic prompt based on module
  let prompt = S.exercise.promptSolve;
  if (moduleId === 'isolateVariable' && currentExercise?.targetVar) {
    prompt = S.exercise.promptFindVar(currentExercise.targetVar);
  } else if (moduleId === 'simplifyExpression') {
    prompt = 'Упрости выражение';
  } else if (moduleId === 'moveAdditive' && currentExercise?.targetVar) {
    prompt = S.exercise.promptFindVar(currentExercise.targetVar);
  } else {
    prompt = promptForModule[moduleId] || S.exercise.promptSolve;
  }

  // Generate next exercise (infinite mode)
  const advanceToNext = useCallback(() => {
    if (isNewModule) {
      setExercise(generateNextExercise(moduleId, difficultyLevel));
    } else {
      if (currentIdx < exercises.length - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        setCompleted(true);
      }
    }
  }, [isNewModule, moduleId, difficultyLevel, currentIdx, exercises]);

  const handleDifficultyChange = useCallback(
    (nextLevel) => {
      if (nextLevel === difficultyLevel) return;
      setDifficultyLevel(nextLevel);
      setSolvedCount(0);
      setFeedback(null);
      setRulePopup(null);
      setExercise(generateNextExercise(moduleId, nextLevel));
    },
    [difficultyLevel, moduleId]
  );

  const handleAction = useCallback(
    (action) => {
      const ex = currentExercise;
      if (!ex) return;

      if (action.type === 'expressionUpdate') {
        if (isNewModule) {
          setExercise({ ...ex, expr: action.expr });
        } else {
          const newExercises = [...exercises];
          newExercises[currentIdx] = { ...ex, expr: action.expr };
          setExercises(newExercises);
        }

        if (action.solved && !ex.solved) {
          setFeedback('success');
          setSolvedCount((c) => c + 1);
          if (isNewModule) {
            setExercise({ ...ex, expr: action.expr, solved: true });
          } else {
            const newExercises = [...exercises];
            newExercises[currentIdx] = { ...ex, expr: action.expr, solved: true };
            setExercises(newExercises);
          }
          setTimeout(() => {
            setFeedback(null);
            advanceToNext();
          }, 1400);
        }
        return;
      }

      // "simplifyWrong" is a local error for wrong divisor pick -- just show feedback
      if (action.type === 'simplifyWrong') {
        setFeedback('error');
        setRulePopup({ ruleKey: 'simplify', isError: true });
        setTimeout(() => setFeedback(null), 600);
        return;
      }

      const result = validate(ex, action);

      if (result.valid) {
        // For moveAdditive with targetVar: check if we still need to divide by coefficient
        if (action.type === 'moveAdditive' && ex.targetVar && result.result?.type === 'equation') {
          const leftTerms = result.result.left;
          if (leftTerms.length === 1) {
            const varTerm = leftTerms[0];
            if (varTerm.vars?.includes(ex.targetVar) && varTerm.coeff > 1) {
              if (isNewModule) {
                setExercise({ ...ex, expr: result.result, step: 2 });
              } else {
                const newExercises = [...exercises];
                newExercises[currentIdx] = { ...ex, expr: result.result, step: 2 };
                setExercises(newExercises);
              }
              setFeedback('success');
              setTimeout(() => setFeedback(null), 600);
              return;
            }
          }
        }

        // For simplify: check if fraction is fully simplified after this step
        if (action.type === 'simplify' && result.result?.type === 'fraction') {
          const numC = result.result.num[0]?.coeff || 1;
          const denC = result.result.den[0]?.coeff || 1;
          const g = gcd(numC, denC);

          if (g > 1) {
            if (isNewModule) {
              setExercise({ ...ex, expr: result.result });
            } else {
              const newExercises = [...exercises];
              newExercises[currentIdx] = { ...ex, expr: result.result };
              setExercises(newExercises);
            }
            setFeedback('success');
            setTimeout(() => setFeedback(null), 600);
            return;
          }
        }

        // Full success: advance
        setFeedback('success');
        setSolvedCount((c) => c + 1);

        if (isNewModule) {
          setExercise({ ...ex, expr: result.result, solved: true });
        } else {
          const newExercises = [...exercises];
          newExercises[currentIdx] = { ...ex, expr: result.result, solved: true };
          setExercises(newExercises);
        }

        setTimeout(() => {
          setFeedback(null);
          advanceToNext();
        }, 1400);
      } else {
        setFeedback('error');
        if (result.ruleKey) {
          setRulePopup({ ruleKey: result.ruleKey, isError: true });
        }
        setTimeout(() => setFeedback(null), 600);
      }
    },
    [currentExercise, isNewModule, exercises, currentIdx, advanceToNext]
  );

  const handleSkip = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

  // Difficulty level colors from strings
  const levels = S.exercise.difficultyLevels;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        padding: '20px',
        gap: '16px',
        overflow: 'auto',
      }}
    >
      {/* Top bar */}
      <motion.div
        {...fadeInUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.7)',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#6b7280',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {S.exercise.backToMenu}
        </motion.button>

        {/* Solved counter for new modules, progress for legacy */}
        {isNewModule ? (
          <motion.div
            key={solvedCount}
            initial={{ scale: 1.3, color: '#a855f7' }}
            animate={{ scale: 1, color: '#6b7280' }}
            transition={{ duration: 0.4 }}
            style={{ fontSize: '0.95rem', fontWeight: 700 }}
          >
            {S.exercise.solvedCount(solvedCount)}
          </motion.div>
        ) : (
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6b7280' }}>
            {S.exercise.progress(currentIdx + 1, exercises?.length || 0)}
          </span>
        )}
      </motion.div>

      {/* Difficulty level switcher — for new modules */}
      {isNewModule && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.62)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginLeft: '4px' }}>
            {S.exercise.difficultyLabel}
          </span>
          {levels.map((lvl) => (
            <motion.button
              key={lvl.key}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleDifficultyChange(lvl.key)}
              style={{
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: difficultyLevel === lvl.key ? '#ffffff' : '#475569',
                background: difficultyLevel === lvl.key ? lvl.color : 'rgba(255,255,255,0.8)',
                border: `1px solid ${lvl.color}40`,
                cursor: 'pointer',
              }}
            >
              {lvl.label}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Task prompt */}
      <motion.h2
        key={`${isNewModule ? solvedCount : currentIdx}-${difficultyLevel}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          textAlign: 'center',
          color: '#1e1b3a',
        }}
      >
        {prompt}
      </motion.h2>

      {/* Hint */}
      {currentExercise?.hint && (
        <motion.p
          key={`hint-${isNewModule ? solvedCount : currentIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: '1rem',
            color: '#9ca3af',
            fontWeight: 600,
            fontStyle: 'italic',
          }}
        >
          {currentExercise.hint}
        </motion.p>
      )}

      {/* Exercise area */}
      <motion.div
        key={`exercise-${isNewModule ? solvedCount : currentIdx}-${difficultyLevel}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '900px',
        }}
      >
        {/* New modules with ExpressionView */}
        {currentExercise && (moduleId === 'isolateVariable' || moduleId === 'simplifyExpression') && (
          <ExpressionView
            exercise={currentExercise}
            onAction={handleAction}
            showEquals={moduleId === 'isolateVariable'}
            simplifyDifficulty={difficultyLevel >= 3 ? 'hard' : 'normal'}
          />
        )}

        {/* Legacy modules */}
        {currentExercise && moduleId === ADDITIVE_MODULE && (!currentExercise.step || currentExercise.step === 1) && (
          <Equation exercise={currentExercise} onAction={handleAction} />
        )}
        {currentExercise && moduleId === ADDITIVE_MODULE && currentExercise.step === 2 && (
          <MultiplicativeEquation exercise={currentExercise} onAction={handleAction} />
        )}
        {currentExercise && moduleId === MULTIPLICATIVE_MODULE && (
          <MultiplicativeEquation exercise={currentExercise} onAction={handleAction} />
        )}
        {currentExercise && FRACTION_MODULES.has(moduleId) && (
          <FractionExercise exercise={currentExercise} onAction={handleAction} />
        )}
      </motion.div>

      {/* Skip button */}
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.9)' }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSkip}
        style={{
          padding: '10px 28px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.5)',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: '#9ca3af',
          marginBottom: '20px',
        }}
      >
        {S.exercise.skip}
      </motion.button>

      {/* Feedback overlay */}
      <FeedbackOverlay type={feedback} onDone={() => setFeedback(null)} />

      {/* Rule popup */}
      {rulePopup && (
        <RulePopup
          ruleKey={rulePopup.ruleKey}
          isError={rulePopup.isError}
          onClose={() => setRulePopup(null)}
        />
      )}

      {/* Celebration — only for legacy modules with finite sets */}
      {!isNewModule && (
        <AnimatePresence>
          {completed && <Celebration onContinue={onBack} />}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
