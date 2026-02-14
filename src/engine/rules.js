import { S } from '../utils/strings';

/**
 * Returns the educational rule text for a given rule key.
 */
export function getRuleExplanation(ruleKey) {
  return S.rules[ruleKey] || S.rules.cantMoveThis;
}

/**
 * Returns a short title for the rule popup
 */
export function getRuleTitle(ruleKey) {
  const titles = {
    moveAdditive: 'Перенос слагаемых',
    moveMultiplicative: 'Перенос множителей',
    simplify: 'Не делится!',
    crossMultiply: 'Перекрёстное умножение',
    combineFractions: 'Общий знаменатель',
    cantMoveThis: 'Нельзя!',
    wrongOperation: 'Неверное действие',
    dontMoveVariable: 'Не трогай переменную!',
    multToDenominator: 'Не туда!',
  };
  return titles[ruleKey] || 'Правило';
}

/**
 * Returns a mini-example for the rule
 */
export function getRuleExample(ruleKey) {
  const examples = {
    moveAdditive: { before: 'x + 3 = 7', after: 'x = 7 − 3', highlight: '+ → −' },
    moveMultiplicative: { before: '3x = 12', after: 'x = 12 / 3', highlight: '× → в знаменатель' },
    simplify: null,
    crossMultiply: { before: 'a/b = c/d', after: 'ad = bc', highlight: '×' },
    combineFractions: { before: '1/a + 1/b', after: '(b+a) / ab', highlight: 'ОЗ' },
    dontMoveVariable: { before: '3x = 15', after: 'x = 15/3', highlight: 'Перенеси 3, не x' },
    multToDenominator: { before: '3x = 15', after: 'x = 15/3', highlight: '3 → в знаменатель' },
  };
  return examples[ruleKey] || null;
}
