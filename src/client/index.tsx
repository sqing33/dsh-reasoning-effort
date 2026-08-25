/** Browser half of dsh-reasoning-effort: a model-seat control over DSH's shared directory. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { ReasoningBar, type ReasoningBarInjected } from './ReasoningBar.tsx'
import { en, zh, type ReasoningKey } from './locales.ts'
import { installReasoningStyles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'reasoning-effort': ReasoningKey
  }
}

const NS = 'reasoning-effort'

export const inject = ['slots', 'locale', 'modelDirectories']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-reasoning-effort: dictionaries')
  ctx.effect(() => installReasoningStyles(), 'dsh-reasoning-effort: styles')
  const t = ctx.locale.bind(NS)

  ctx.inject(['slots', 'modelDirectories'], (scope: ClientContext) => {
    const models = scope.modelDirectories
    scope.slots.inject('conversation.input.model', () => scope.slots.register({
      name: 'conversation.input.model',
      priority: -1,
      label: () => t('label'),
      locale: NS,
      inject: (sessionId): ReasoningBarInjected => {
        const directory = models.directoryFor(sessionId)
        return {
          directory: directory.store,
          load: () => { directory.load().catch(() => { /* surfaced on the shared store */ }) },
          select: selection => directory.select(selection),
        }
      },
    }, ReasoningBar))
  })
}
