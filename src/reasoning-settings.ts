/** Pure settings transformation used by the Cordis-facing plugin wrapper. */

import type { SettingsPathOp } from '@deepseek-ai/dsh-settings'
import {
  defaultEffortsFor,
  mergeEfforts,
  type ReasoningEfforts,
  type ReasoningLevel,
} from './reasoning-protocols.ts'

export interface ModelReasoningConfig {
  /** Override the provider/protocol default wire map for this model. */
  efforts?: ReasoningEfforts
  /** Explicitly mark this model as non-reasoning. */
  disabled?: boolean
}

export interface ReasoningDefaultsConfig {
  /** Protocol fallback used when an existing Provider does not declare one. */
  api?: string
  /** Default reasoning level added when the Provider does not already set one. */
  reasoning?: ReasoningLevel
  /** Wire map shared by every automatically discovered Provider. */
  efforts?: ReasoningEfforts
}

export interface ProviderReasoningConfig extends ReasoningDefaultsConfig {
  /** Skip this Provider while retaining automatic discovery for all others. */
  disabled?: boolean
  /** Per-model overrides keyed by model id. */
  models?: Record<string, ModelReasoningConfig>
}

export interface ReasoningConfig {
  /** Discover all existing Providers. Defaults to true. */
  auto?: boolean
  /** Defaults applied to every discovered Provider. */
  defaults?: ReasoningDefaultsConfig
  /** Optional Provider-specific overrides; this is not an allowlist unless auto is false. */
  providers?: Record<string, ProviderReasoningConfig>
}

function atPath(source: unknown, path: readonly string[]): unknown {
  let current = source
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringAt(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function effectiveEfforts(
  api: string | undefined,
  providerEfforts: ReasoningEfforts | undefined,
  modelEfforts: ReasoningEfforts | undefined,
): ReasoningEfforts {
  return mergeEfforts(mergeEfforts(defaultEffortsFor(api), providerEfforts), modelEfforts)
}

function mergeProviderConfig(
  defaults: ReasoningDefaultsConfig | undefined,
  override: ProviderReasoningConfig | undefined,
): ProviderReasoningConfig {
  const defaultEfforts = defaults?.efforts
  const overrideEfforts = override?.efforts
  const efforts = defaultEfforts === undefined && overrideEfforts === undefined
    ? undefined
    : mergeEfforts(defaultEfforts ?? {}, overrideEfforts)

  return {
    api: override?.api ?? defaults?.api,
    reasoning: override?.reasoning ?? defaults?.reasoning,
    efforts,
    disabled: override?.disabled,
    models: override?.models,
  }
}

function buildProviderOps(
  provider: string,
  providerConfig: ProviderReasoningConfig,
  profile: Record<string, unknown>,
): SettingsPathOp[] {
  if (providerConfig.disabled === true) return []

  const ops: SettingsPathOp[] = []
  const api = providerConfig.api ?? stringAt(profile.api)

  if (providerConfig.reasoning !== undefined && profile.reasoning === undefined) {
    ops.push({
      op: 'set',
      path: ['providers', provider, 'reasoning'],
      value: providerConfig.reasoning,
    })
  }

  // Settings path operations do not address array elements. Replacing the
  // array once preserves every existing model field while adding only the
  // missing reasoning declaration.
  const models = profile.models
  if (Array.isArray(models)) {
    let modelsChanged = false
    const nextModels = models.map((entry) => {
      if (!isRecord(entry)) return entry
      const modelId = entry.id
      if (typeof modelId !== 'string' || modelId.length === 0) return entry

      const modelConfig = providerConfig.models?.[modelId]
      if (modelConfig?.disabled === true) {
        if (entry.reasoningEfforts === undefined) {
          modelsChanged = true
          return { ...entry, reasoningEfforts: false }
        }
        return entry
      }
      if (entry.reasoningEfforts !== undefined) return entry

      modelsChanged = true
      return {
        ...entry,
        reasoningEfforts: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts),
      }
    })

    if (modelsChanged) {
      ops.push({
        op: 'set',
        path: ['providers', provider, 'models'],
        value: nextModels,
      })
    }
  }

  const overrides = profile.modelOverrides
  if (isRecord(overrides)) {
    for (const [modelId, modelOverride] of Object.entries(overrides)) {
      if (!isRecord(modelOverride)) continue
      const modelConfig = providerConfig.models?.[modelId]

      if (modelConfig?.disabled === true) {
        if (modelOverride.reasoningEfforts === undefined) {
          ops.push({
            op: 'set',
            path: ['providers', provider, 'modelOverrides', modelId, 'reasoningEfforts'],
            value: false,
          })
        }
        continue
      }
      if (modelOverride.reasoningEfforts !== undefined) continue

      ops.push({
        op: 'set',
        path: ['providers', provider, 'modelOverrides', modelId, 'reasoningEfforts'],
        value: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts),
      })
    }
  }

  return ops
}

/** Build additive updates for all Provider profiles that already exist in llm-pi-ai. */
export function buildReasoningOps(
  current: unknown,
  config: ReasoningConfig = {},
): SettingsPathOp[] {
  const providers = atPath(current, ['providers'])
  if (!isRecord(providers)) return []

  const ops: SettingsPathOp[] = []
  const configuredProviders = config.providers ?? {}
  const auto = config.auto !== false

  for (const [provider, profile] of Object.entries(providers)) {
    if (!isRecord(profile)) continue

    const override = configuredProviders[provider]
    if (!auto && override === undefined) continue

    ops.push(...buildProviderOps(
      provider,
      mergeProviderConfig(config.defaults, override),
      profile,
    ))
  }

  return ops
}
