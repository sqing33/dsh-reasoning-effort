/**
 * Provider-aware reasoning effort configuration for DeepSeek Harness.
 *
 * This module does not replace the Harness LLM adapter. It only fills missing
 * reasoningEfforts declarations in the llm-pi-ai settings namespace so Harness
 * can expose the effort selector for custom providers and models.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { SettingsPathOp } from '@deepseek-ai/dsh-settings'
import {
  REASONING_LEVELS,
  type ReasoningEfforts,
} from './reasoning-protocols.ts'
import {
  buildReasoningOps,
  type ReasoningConfig,
} from './reasoning-settings.ts'

export type {
  ModelReasoningConfig,
  ProviderReasoningConfig,
  ReasoningConfig,
  ReasoningDefaultsConfig,
} from './reasoning-settings.ts'

const reasoningEfforts = z.dict(
  z.union([z.string(), z.const(null)]),
  z.union(REASONING_LEVELS),
) as unknown as z<ReasoningEfforts>

const modelReasoningConfig = z.object({
  efforts: reasoningEfforts,
  disabled: z.boolean(),
})

const providerReasoningConfig = z.object({
  api: z.string(),
  reasoning: z.union(REASONING_LEVELS),
  efforts: reasoningEfforts,
  disabled: z.boolean(),
  models: z.dict(modelReasoningConfig),
})

export const reasoningConfigSchema: z<ReasoningConfig> = z.object({
  auto: z.boolean(),
  defaults: z.object({
    api: z.string(),
    reasoning: z.union(REASONING_LEVELS),
    efforts: reasoningEfforts,
  }),
  providers: z.dict(providerReasoningConfig),
})

// A namespace is represented by its validated string at runtime. Keeping the
// literal here works with both the legacy settingsNamespace() API and DSH
// 0.1.6+, where that helper is no longer exported.
const PI_AI_NAMESPACE = 'llm-pi-ai'

const STARTUP_RETRY_DELAY_MS = 50
const STARTUP_RETRY_LIMIT = 40

async function syncReasoningSettings(ctx: Context, config: ReasoningConfig): Promise<boolean> {
  const current = ctx.settings.get(PI_AI_NAMESPACE)
  if (current === undefined) return false

  const ops: SettingsPathOp[] = buildReasoningOps(current, config)
  if (ops.length === 0) return true

  try {
    await ctx.settings.mutate(PI_AI_NAMESPACE, ops)
    ctx.logger.info(
      '[dsh-reasoning-effort] wrote %d reasoning-effort setting(s)',
      ops.length,
    )
  } catch (error) {
    ctx.logger.warn('[dsh-reasoning-effort] could not update llm-pi-ai settings')
    ctx.logger.warn(error)
  }
  return true
}

export function applyReasoningEffort(ctx: Context, config: ReasoningConfig = {}): void {
  let startupAttempts = 0

  const sync = (): void => {
    void syncReasoningSettings(ctx, config)
      .then((ready) => {
        if (ready || startupAttempts >= STARTUP_RETRY_LIMIT) return
        startupAttempts += 1
        setTimeout(sync, STARTUP_RETRY_DELAY_MS)
      })
      .catch((error) => {
        ctx.logger.warn('[dsh-reasoning-effort] reasoning-effort sync failed')
        ctx.logger.warn(error)
      })
  }

  // llm-pi-ai may register its settings namespace later in the composition.
  // Retry briefly so a fresh install does not miss the first sync.
  setTimeout(sync, 0)
  ctx.on('settings/updated', (namespace: unknown) => {
    if (namespace === PI_AI_NAMESPACE) sync()
  })
}
