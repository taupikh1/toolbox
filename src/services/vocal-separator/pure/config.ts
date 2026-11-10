/**
 * Shared constants for vocal separator.
 * Duration limits live in deviceTier.ts (single source of truth, 22C).
 */
export const MODEL_CACHE_NAME = 'vocal-separator-models-v1';
export const MODEL_CACHE_KEY = 'uvr-mdx-net-inst-hq-3';

/** @deprecated use getLimitsForTier(tier).maxDurationSec — kept only if something still imports */
export const MAX_DURATION_SEC = 180;
