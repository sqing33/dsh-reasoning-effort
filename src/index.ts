/**
 * Standalone reasoning-effort configuration plugin for DeepSeek Harness.
 *
 * It fills missing reasoningEfforts declarations in the llm-pi-ai settings
 * namespace so Harness can expose the effort selector for custom providers
 * and models. Existing declarations are preserved.
 */

import { Context } from '@deepseek-ai/cordis'
import {
  applyReasoningEffort,
  reasoningConfigSchema,
  type ReasoningConfig,
} from './reasoning-effort.ts'

export const name = 'reasoning-effort'
export const inject = ['settings']
export const Config = reasoningConfigSchema

export function apply(ctx: Context, config: ReasoningConfig = {}): void {
  applyReasoningEffort(ctx, config)
}
