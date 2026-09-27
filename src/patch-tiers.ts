/**
 * Force the reasoning-effort ladder into the active profile patch.
 *
 * A settings write alone cannot beat a loader patch: when the model list is
 * declared in the profile's cordis.patch.yml, that file is the source of
 * truth and the settings layer stays invisible. This module rewrites the
 * patch itself, so the ladder applies no matter what the file already says.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  DEFAULT_EFFORTS,
  mergeEfforts,
  type ReasoningEfforts,
} from './reasoning-protocols.ts'
import type { ReasoningConfig } from './reasoning-settings.ts'

const PATCH_ENTRY_ID = 'llm-pi-ai'

const indentOf = (line: string): number => line.length - line.replace(/^ +/, '').length

function renderEffortBlock(efforts: ReasoningEfforts): string {
  return [
    '            reasoningEfforts:',
    ...Object.keys(efforts).map((key) => `              ${key}: ${efforts[key]}`),
  ].join('\n')
}

/**
 * Replace every declared model's reasoningEfforts with the forced ladder.
 * Returns the input unchanged when the layout is not recognized.
 */
export function normalizePatchModels(raw: string, efforts: ReasoningEfforts): string {
  const lines = raw.split('\n')

  const start = lines.indexOf(`- id: ${PATCH_ENTRY_ID}`)
  if (start < 0) return raw

  let entryEnd = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^- id: /.test(lines[i]!)) {
      entryEnd = i
      break
    }
  }

  let modelsAt = -1
  for (let i = start; i < entryEnd; i++) {
    if (/^\s+models:\s*$/.test(lines[i]!)) {
      modelsAt = i
      break
    }
  }
  if (modelsAt < 0) return raw

  const dash = indentOf(lines[modelsAt + 1] ?? '')
  let stop = entryEnd
  for (let i = modelsAt + 1; i < entryEnd; i++) {
    if (lines[i]!.trim() === '') continue
    if (indentOf(lines[i]!) < dash) {
      stop = i
      break
    }
  }

  const dashRe = new RegExp(`^ {${dash}}- id: `)
  const starts: number[] = []
  for (let i = modelsAt + 1; i < stop; i++) {
    if (dashRe.test(lines[i]!)) starts.push(i)
  }

  for (let k = starts.length - 1; k >= 0; k--) {
    const from = starts[k]!
    const until = k + 1 < starts.length ? starts[k + 1]! : stop

    let cutAt = -1
    let cutTo = -1
    for (let i = from; i < until; i++) {
      if (/^\s{12}reasoningEfforts:\s*$/.test(lines[i]!)) {
        cutAt = i
        cutTo = i + 1
        while (cutTo < until && /^\s{14,}\S/.test(lines[cutTo]!)) cutTo++
        break
      }
    }

    let insertAt = until
    while (insertAt - 1 > from && lines[insertAt - 1]!.trim() === '') insertAt--

    if (cutAt >= 0) {
      lines.splice(cutAt, cutTo - cutAt)
      insertAt -= cutTo - cutAt
    }
    lines.splice(insertAt, 0, ...renderEffortBlock(efforts).split('\n'))
  }

  return lines.join('\n')
}

/** Rewrite the profile patch so every declared model offers the forced ladder. */
export function forcePatchEffortTiers(
  ctx: Context,
  config: ReasoningConfig & { force?: boolean },
): void {
  if (config.force === false) return

  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const patchFile = resolve(here, '..', '..', '..', 'cordis.patch.yml')
    if (!existsSync(patchFile)) return

    const efforts = mergeEfforts(DEFAULT_EFFORTS, config.defaults?.efforts)
    const before = readFileSync(patchFile, 'utf8')
    const after = normalizePatchModels(before, efforts)
    if (after === before) return

    writeFileSync(patchFile, after, 'utf8')
    ctx.logger?.info?.(
      '[dsh-reasoning-effort] forced %d reasoning tier(s) into %s',
      Object.keys(efforts).length,
      patchFile,
    )
  } catch (error) {
    ctx.logger?.warn?.('[dsh-reasoning-effort] could not force effort tiers into the profile patch')
    ctx.logger?.warn?.(error)
  }
}
