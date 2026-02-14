import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Equation from './Equation';
import MultiplicativeEquation from './MultiplicativeEquation';
import FractionExercise from './FractionExercise';
import ExpressionView from './ExpressionView';
import FeedbackOverlay from './FeedbackOverlay';
import RulePopup from './RulePopup';
import ProgressBar from './ProgressBar';
import Celebration from './Celebration';
import { generateExerciseSet as generateOldExerciseSet } from '../engine/exerciseGenerator';
import { generateExerciseSet } from '../engine/newExerciseGenerator';
import { validate } from '../engine/validator';
import { S } from '../utils/strings';
import { fadeInUp, spring } from '../utils/animations';

const EXERCISES_PER_MODULE = 30; // Changed to 30 for new modules
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

function buildExerciseSet(moduleId, count, simplifyDifficulty = 'normal') {
  if (moduleId === 'simplifyExpression') {
    return generateExerciseSet(moduleId, count, { simplifyDifficulty });
  }
  if (moduleId === 'isolateVariable') {
    return generateExerciseSet(moduleId, count);
  }
  return generateOldExerciseSet(moduleId, count);
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export default function ExerciseScreen({ moduleId, onBack }) {
  // Use new generator for new modules, old generator for legacy modules
  const isNewModule = moduleId === 'isolateVariable' || moduleId === 'simplifyExpression';
  const exerciseCount = isNewModule ? EXERCISES_PER_MODULE : OLD_EXERCISES_PER_MODULE;
  const [simplifyDifficulty, setSimplifyDifficulty] = useState('normal');

  const [exercises, setExercises] = useState(() =>
    buildExerciseSet(moduleId, exerciseCount, simplifyDifficulty)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [rulePopup, setRulePopup] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);

  const exercise = exercises[currentIdx];

  // Dynamic prompt based on module
  let prompt = S.exercise.promptSolve;
  if (moduleId === 'isolateVariable' && exercise?.targetVar) {
    prompt = S.exercise.promptFindVar(exercise.targetVar);
  } else if (moduleId === 'simplifyExpression') {
    prompt = 'Упрости выражение';
  } else if (moduleId === 'moveAdditive' && exercise?.targetVar) {
    prompt = S.exercise.promptFindVar(exercise.targetVar);
  } else {
    prompt = promptForModule[moduleId] || S.exercise.promptSolve;
  }

  const advanceExercise = useCallback(() => {
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setCompleted(true);
    }
  }, [currentIdx, exercises.length]);

  const resetRunWith = useCallback((nextExercises) => {
    setExercises(nextExercises);
    setCurrentIdx(0);
    setFeedback(null);
    setRulePopup(null);
    setCompleted(false);
    setSolvedCount(0);
  }, []);

  const handleSimplifyDifficultyChange = useCallback(
    (nextDifficulty) => {
      if (nextDifficulty === simplifyDifficulty) return;
      setSimplifyDifficulty(nextDifficulty);
      const nextExercises = buildExerciseSet(moduleId, exerciseCount, nextDifficulty);
      resetRunWith(nextExercises);
    },
    [simplifyDifficulty, moduleId, exerciseCount, resetRunWith]
  );

  const handleAction = useCallback(
    (action) => {
      if (action.type === 'expressionUpdate') {
        const newExercises = [...exercises];
        newExercises[currentIdx] = { ...exercise, expr: action.expr };
        setExercises(newExercises);

        if (action.solved && !exercise.solved) {
          setFeedback('success');
          setSolvedCount((c) => c + 1);
          newExercises[currentIdx] = { ...exercise, expr: action.expr, solved: true };
          setExercises(newExercises);
          setTimeout(() => {
            setFeedback(null);
            advanceExercise();
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

      const result = validate(exercise, action);

      if (result.valid) {
        // For moveAdditive with targetVar: check if we still need to divide by coefficient
        if (action.type === 'moveAdditive' && exercise.targetVar && result.result?.type === 'equation') {
          const leftTerms = result.result.left;
          if (leftTerms.length === 1) {
            const varTerm = leftTerms[0];
            if (varTerm.vars?.includes(exercise.targetVar) && varTerm.coeff > 1) {
              // Step 1 done — variable isolated but still has coefficient. Transition to step 2.
              const newExercises = [...exercises];
              newExercises[currentIdx] = { ...exercise, expr: result.result, step: 2 };
              setExercises(newExercises);
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
            // Not fully simplified yet -- update expression but DON'T advance
            const newExercises = [...exercises];
            newExercises[currentIdx] = { ...exercise, expr: result.result };
            setExercises(newExercises);
            // Brief success flash for correct step
            setFeedback('success');
            setTimeout(() => setFeedback(null), 600);
            return;
          }
        }

        // Full success: advance
        setFeedback('success');
        setSolvedCount((c) => c + 1);

        const newExercises = [...exercises];
        newExercises[currentIdx] = {
          ...exercise,
          expr: result.result,
          solved: true,
        };
        setExercises(newExercises);

        setTimeout(() => {
          setFeedback(null);
          advanceExercise();
        }, 1400);
      } else {
        setFeedback('error');
        if (result.ruleKey) {
          setRulePopup({ ruleKey: result.ruleKey, isError: true });
        }
        setTimeout(() => setFeedback(null), 600);
      }
    },
    [exercise, exercises, currentIdx, advanceExercise]
  );

  const handleSkip = useCallback(() => {
    advanceExercise();
  }, [advanceExercise]);

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

        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6b7280' }}>
          {S.exercise.progress(currentIdx + 1, exercises.length)}
        </span>
      </motion.div>

      {/* Progress bar */}
      <ProgressBar current={solvedCount} total={exercises.length} />

      {moduleId === 'simplifyExpression' && (
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
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginLeft: '4px' }}>
            {S.exercise.simplifyDifficulty}
          </span>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSimplifyDifficultyChange('normal')}
            style={{
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: simplifyDifficulty === 'normal' ? '#ffffff' : '#475569',
              background: simplifyDifficulty === 'normal' ? '#3b82f6' : 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(59,130,246,0.25)',
            }}
          >
            {S.exercise.simplifyNormal}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSimplifyDifficultyChange('hard')}
            style={{
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: simplifyDifficulty === 'hard' ? '#ffffff' : '#475569',
              background: simplifyDifficulty === 'hard' ? '#0f766e' : 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(15,118,110,0.26)',
            }}
          >
            {S.exercise.simplifyHard}
          </motion.button>
        </motion.div>
      )}

      {moduleId === 'simplifyExpression' && simplifyDifficulty === 'hard' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f766e' }}
        >
          {S.exercise.simplifyHardHint}
        </motion.p>
      )}

      {/* Task prompt */}
      <motion.h2
        key={`${currentIdx}-${simplifyDifficulty}`}
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
      {exercise?.hint && (
        <motion.p
          key={`hint-${currentIdx}`}
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
          {exercise.hint}
        </motion.p>
      )}

      {/* Exercise area */}
      <motion.div
        key={`exercise-${currentIdx}-${simplifyDifficulty}`}
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
        {exercise && (moduleId === 'isolateVariable' || moduleId === 'simplifyExpression') && (
          <ExpressionView
            exercise={exercise}
            onAction={handleAction}
            showEquals={moduleId === 'isolateVariable'}
            simplifyDifficulty={simplifyDifficulty}
          />
        )}

        {/* Legacy modules */}
        {exercise && moduleId === ADDITIVE_MODULE && (!exercise.step || exercise.step === 1) && (
          <Equation exercise={exercise} onAction={handleAction} />
        )}
        {exercise && moduleId === ADDITIVE_MODULE && exercise.step === 2 && (
          <MultiplicativeEquation exercise={exercise} onAction={handleAction} />
        )}
        {exercise && moduleId === MULTIPLICATIVE_MODULE && (
          <MultiplicativeEquation exercise={exercise} onAction={handleAction} />
        )}
        {exercise && FRACTION_MODULES.has(moduleId) && (
          <FractionExercise exercise={exercise} onAction={handleAction} />
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

      {/* Celebration */}
      <AnimatePresence>
        {completed && <Celebration onContinue={onBack} />}
      </AnimatePresence>
    </motion.div>
  );
}
