/**
 * Constants Barrel — Re-exports all constants from modular files.
 */
export { REASON_CODES } from './reason-codes.js';
export { BANGLA_TEMPLATES } from './bangla-templates.js';
export { TYPOLOGY_META, BANGLISH_NORMALIZATION_MAP } from './typology-meta.js';
export {
  INVESTIGATION_REASON_CODES,
  HUMAN_REVIEW_RULES,
  MATCHING_WEIGHTS_VERSION,
  INVESTIGATION_POLICY_VERSION,
  SAFETY_VALIDATOR_VERSION,
  HIGH_VALUE_REVIEW_THRESHOLD_BDT,
  GOLDEN_HOUR_WINDOW_MINUTES,
  getMatchingWeights,
  getMatchingThresholds,
  getAmountTolerance,
  getTimeTolerance,
  configureMatchingWeights,
  resetMatchingWeights
} from './investigation-policy.js';
export type {
  MatchingWeightConfig,
  MatchingThresholdConfig,
  AmountToleranceConfig,
  TimeToleranceConfig
} from './investigation-policy.js';
