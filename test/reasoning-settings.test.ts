import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReasoningOps } from '../src/reasoning-settings.ts'
import { normalizePatchModels } from '../src/patch-tiers.ts'

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
    ['providers', 'already-configured', 'models'],
  ])

  const acmeModels = ops[0]?.value as Array<Record<string, unknown>>
  assert.deepEqual(acmeModels[0]?.reasoningEfforts, {
    off: 'off',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  })

  // The ladder is forced onto every declared model: an explicit `false` and a
  // narrower custom map are both overwritten.
  const forced = ops[3]?.value as Array<Record<string, unknown>>
  const ladder = { off: 'off', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' }
  assert.deepEqual(forced[0]?.reasoningEfforts, ladder)
  assert.deepEqual(forced[1]?.reasoningEfforts, ladder)
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
    off: 'off',
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
  // An explicit model opt-out still wins; every other model gets the ladder.
  assert.equal(models[0]?.reasoningEfforts, false)
  assert.deepEqual(models[1]?.reasoningEfforts, {
    off: 'off',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  })
})

test('normalizePatchModels rewrites every declared model and is idempotent', () => {
  const patch = [
    '- id: llm-pi-ai',
    '  name: "@deepseek-ai/dsh-llm-pi-ai"',
    '  config:',
    '    providers:',
    '      nas:',
    '        models:',
    '          - id: alpha',
    '            contextWindow: 1000000',
    '            reasoningEfforts:',
    '              high: high',
    '              max: max',
    '          - id: beta',
    '            contextWindow: 128000',
    '        modelOverrides: {}',
    '',
  ].join('\n')

  const efforts = {
    off: 'off',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  }
  const once = normalizePatchModels(patch, efforts)

  assert.match(once, /- id: alpha\n            contextWindow: 1000000\n            reasoningEfforts:\n              off: off/)
  assert.doesNotMatch(once, /              high: high\n              max: max\n/)
  // beta gained the ladder even though it declared none.
  assert.match(once, /- id: beta\n            contextWindow: 128000\n            reasoningEfforts:/)
  // Everything outside the model list is untouched.
  assert.match(once, /        modelOverrides: \{\}/)
  assert.equal(once.match(/reasoningEfforts:/g)?.length, 2)
  // Running again changes nothing.
  assert.equal(normalizePatchModels(once, efforts), once)
})

test('normalizePatchModels leaves an unrelated patch untouched', () => {
  const patch = ['- id: something-else', '  config: {}', ''].join('\n')
  assert.equal(normalizePatchModels(patch, { high: 'high' }), patch)
})
