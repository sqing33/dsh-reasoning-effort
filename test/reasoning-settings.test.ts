import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReasoningOps } from '../src/reasoning-settings.ts'

test('zero config discovers and enhances arbitrary existing Providers', () => {
  const ops = buildReasoningOps({
    providers: {
      'acme-gateway': {
        api: 'openai-responses',
        models: [{ id: 'alpha', name: 'Alpha' }],
      },
      'unknown-provider': {
        models: [{ id: 'beta' }],
        modelOverrides: {
          gamma: { temperature: 0.2 },
        },
      },
      'already-configured': {
        models: [
          { id: 'disabled', reasoningEfforts: false },
          { id: 'custom', reasoningEfforts: { low: 'tiny' } },
        ],
      },
    },
  })

  assert.deepEqual(ops.map(operation => operation.path), [
    ['providers', 'acme-gateway', 'models'],
    ['providers', 'unknown-provider', 'models'],
    ['providers', 'unknown-provider', 'modelOverrides', 'gamma', 'reasoningEfforts'],
  ])

  const acmeModels = ops[0]?.value as Array<Record<string, unknown>>
  assert.deepEqual(acmeModels[0]?.reasoningEfforts, {
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  })
})

test('global defaults and Provider/model overrides layer over automatic discovery', () => {
  const ops = buildReasoningOps({
    providers: {
      standard: {
        models: [{ id: 'regular' }],
      },
      special: {
        models: [{ id: 'special-model' }],
      },
      excluded: {
        models: [{ id: 'leave-alone' }],
      },
    },
  }, {
    defaults: {
      reasoning: 'medium',
      efforts: { low: 'global-low' },
    },
    providers: {
      special: {
        efforts: { high: 'provider-high' },
        models: {
          'special-model': { efforts: { max: 'model-max' } },
        },
      },
      excluded: { disabled: true },
    },
  })

  assert.deepEqual(ops.map(operation => operation.path), [
    ['providers', 'standard', 'reasoning'],
    ['providers', 'standard', 'models'],
    ['providers', 'special', 'reasoning'],
    ['providers', 'special', 'models'],
  ])

  const specialModels = ops[3]?.value as Array<Record<string, unknown>>
  assert.deepEqual(specialModels[0]?.reasoningEfforts, {
    low: 'global-low',
    medium: 'medium',
    high: 'provider-high',
    xhigh: 'xhigh',
    max: 'model-max',
  })
})

test('auto false retains the previous explicit-Provider allowlist behavior', () => {
  const ops = buildReasoningOps({
    providers: {
      configured: { models: [{ id: 'enabled-model' }] },
      unconfigured: { models: [{ id: 'untouched-model' }] },
    },
  }, {
    auto: false,
    providers: {
      configured: {},
    },
  })

  assert.deepEqual(ops.map(operation => operation.path), [
    ['providers', 'configured', 'models'],
  ])
})

test('model opt-outs are additive and missing Providers are never created', () => {
  const ops = buildReasoningOps({
    providers: {
      existing: {
        models: [
          { id: 'non-reasoning' },
          { id: 'preconfigured', reasoningEfforts: false },
        ],
      },
    },
  }, {
    providers: {
      existing: {
        models: {
          'non-reasoning': { disabled: true },
        },
      },
      missing: {
        reasoning: 'high',
      },
    },
  })

  assert.equal(ops.length, 1)
  const models = ops[0]?.value as Array<Record<string, unknown>>
  assert.equal(models[0]?.reasoningEfforts, false)
  assert.equal(models[1]?.reasoningEfforts, false)
})
