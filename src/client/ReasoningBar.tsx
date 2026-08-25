import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'

export interface ReasoningBarInjected {
  /** Shared model directory store owned by the official model selector. */
  directory: SnapshotStore<ModelDirectoryState>
  /** Refresh the model catalog and current selection. */
  load: () => void
  /** Submit the complete route plus the newly selected effort. */
  select: (selection: ModelSelection) => Promise<void>
}

export type ReasoningBarProps = PropsRuntime<'conversation.input.model'>
  & InjectFace<ReasoningBarInjected>
  & PropsLocale<'reasoning-effort'>

type CatalogModel = ModelDirectoryState['groups'][number]['models'][number]
type Effort = NonNullable<CatalogModel['reasoning']>['efforts'][number]

function modelFor(state: ModelDirectoryState) {
  const current = state.current
  if (current === null) return undefined
  for (const group of state.groups) {
    if (group.id !== current.provider) continue
    const model = group.models.find(candidate => candidate.id === current.model)
    if (model !== undefined) return { current, group, model }
  }
  return undefined
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface EffortSliderProps {
  efforts: readonly Effort[]
  index: number
  disabled: boolean
  onChange: (index: number) => void
  onCommit: (index: number) => void
}

/** A Codex-style thick, pointer-draggable discrete slider. */
function EffortSlider({ efforts, index, disabled, onChange, onCommit }: EffortSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const lastIndex = Math.max(1, efforts.length - 1)
  const shownIndex = clamp(Math.round(index), 0, lastIndex)
  const positionForIndex = (value: number): string => {
    const ratio = efforts.length <= 1 ? 0 : clamp(value / lastIndex, 0, 1)
    const percent = ratio * 100
    const offset = 15 - 30 * ratio
    const sign = offset < 0 ? '- ' : '+ '
    return 'calc(' + percent + '% ' + sign + Math.abs(offset) + 'px)'
  }

  const positionFor = (clientX: number): number => {
    const track = trackRef.current
    if (track === null || efforts.length <= 1) return 0
    const rect = track.getBoundingClientRect()
    const inset = 30
    const ratio = (clientX - rect.left - inset) / Math.max(1, rect.width - inset * 2)
    return clamp(ratio * lastIndex, 0, lastIndex)
  }

  const snap = (position: number): number => clamp(Math.round(position), 0, lastIndex)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    setDragging(true)
    onChange(snap(positionFor(event.clientX)))
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    onChange(snap(positionFor(event.clientX)))
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    const next = snap(positionFor(event.clientX))
    draggingRef.current = false
    setDragging(false)
    onChange(next)
    onCommit(next)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : 0
    if (direction === 0) return
    event.preventDefault()
    const next = clamp(shownIndex + direction, 0, lastIndex)
    onChange(next)
    onCommit(next)
  }

  return (
    <div
      ref={trackRef}
      className="dsh-reasoning-effort__slider"
      data-dragging={dragging}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="推理等级"
      aria-valuemin={0}
      aria-valuemax={lastIndex}
      aria-valuenow={shownIndex}
      aria-valuetext={efforts[shownIndex]?.name ?? ''}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onKeyDown={onKeyDown}
    >
      <div className="dsh-reasoning-effort__range">
        <span className="dsh-reasoning-effort__rail" />
        <span
          className="dsh-reasoning-effort__fill"
          style={{ width: positionForIndex(shownIndex) }}
        />
        {efforts.map((effort, effortIndex) => (
          <span
            key={effort.id}
            className="dsh-reasoning-effort__tick"
            data-active={effortIndex <= shownIndex}
            data-major={effortIndex === shownIndex}
            style={{ left: positionForIndex(effortIndex) }}
            title={effort.description}
          />
        ))}
        <span
          className="dsh-reasoning-effort__thumb"
          style={{ left: positionForIndex(shownIndex) }}
        />
      </div>
    </div>
  )
}

function BoltIcon() {
  return (
    <svg className="dsh-reasoning-model__bolt" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.2 2.7 5.5 13h5.1l-.8 8.3L18.5 11h-5.1l-.2-8.3Z" fill="currentColor" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className="dsh-reasoning-model__chevron" data-open={open} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Model seat replacement: model name, Chinese effort label, and the thick Codex-style slider. */
export function ReasoningBar({ locked, directory, load, select, t }: ReasoningBarProps) {
  const state = useSyncExternalStore(
    listener => directory.subscribe(listener),
    () => directory.getSnapshot(),
  )
  const [open, setOpen] = useState(false)
  const [localIndex, setLocalIndex] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: globalThis.MouseEvent): void => {
      const target = event.target
      if (target instanceof Node && rootRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  const currentModel = useMemo(() => modelFor(state), [state])
  const choices = useMemo(
    () => state.groups.flatMap(group => group.models.map(model => ({ group, model }))),
    [state.groups],
  )
  const reasoning = currentModel?.model.reasoning
  const efforts = reasoning?.efforts ?? []
  const fallbackEffort = reasoning?.defaultEffort ?? efforts[Math.floor(efforts.length / 2)]?.id
  const selectedId = state.current?.reasoningEffort ?? fallbackEffort
  const selectedIndex = Math.max(0, efforts.findIndex(effort => effort.id === selectedId))
  const selected = efforts[selectedIndex]
  const displayIndex = localIndex === null
    ? selectedIndex
    : clamp(localIndex, 0, Math.max(0, efforts.length - 1))
  const displaySelected = efforts[displayIndex]
  const isMax = efforts.length > 1 && displayIndex === efforts.length - 1
  const busy = locked === true || state.status === 'selecting'
  const modelLabel = currentModel?.model.name ?? state.current?.model ?? t('chooseModel')

  useEffect(() => {
    setLocalIndex(selectedIndex)
  }, [selectedIndex, efforts])

  const chooseModel = (provider: string, modelId: string): void => {
    const target = choices.find(choice => choice.group.id === provider && choice.model.id === modelId)
    if (target === undefined || state.current === null) return
    if (state.current.provider === provider && state.current.model === modelId) return

    const targetEfforts = target.model.reasoning?.efforts ?? []
    const currentEffort = state.current.reasoningEffort
    const effort = currentEffort !== undefined && targetEfforts.some(item => item.id === currentEffort)
      ? currentEffort
      : target.model.reasoning?.defaultEffort ?? targetEfforts[Math.floor(targetEfforts.length / 2)]?.id
    const selection: ModelSelection = { provider, model: modelId }
    if (effort !== undefined) selection.reasoningEffort = effort
    void select(selection).catch(() => { /* shared store owns the error */ })
  }

  const commitEffort = (index: number): void => {
    const effort = efforts[index]
    if (effort === undefined || state.current === null || effort.id === selected?.id) return
    void select({
      provider: state.current.provider,
      model: state.current.model,
      reasoningEffort: effort.id,
    }).catch(() => { /* shared store owns the error */ })
  }

  const toggle = (): void => {
    if (busy) return
    if (!open) load()
    setOpen(value => !value)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className="dsh-reasoning-model"
      data-max={isMax}
      data-open={open}
      onKeyDown={onKeyDown}
    >
      <button
        className="dsh-reasoning-model__trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={reasoning === undefined ? modelLabel : modelLabel + '，' + t('label') + ' ' + (displaySelected?.name ?? t('unsupported'))}
        disabled={busy}
        onClick={toggle}
      >
        <BoltIcon />
        <span className="dsh-reasoning-model__model" title={modelLabel}>{modelLabel}</span>
        {reasoning !== undefined && (
          <span className="dsh-reasoning-model__effort" title={t('label') + ' ' + (displaySelected?.name ?? t('unsupported'))}>
            <span className="dsh-reasoning-model__effort-label">{t('label')}</span>
            <span>{displaySelected?.name ?? t('unsupported')}</span>
          </span>
        )}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="dsh-reasoning-model__popover" role="dialog" aria-label={t('menu')}>
          <div className="dsh-reasoning-model__model-head">
            <span className="dsh-reasoning-model__section-label">{t('model')}</span>
            <span className="dsh-reasoning-model__model-head-value" title={modelLabel}>{modelLabel}</span>
          </div>

          <div className="dsh-reasoning-model__models" role="listbox" aria-label={t('chooseModel')}>
            {state.status === 'loading' && <div className="dsh-reasoning-model__status">{t('loading')}</div>}
            {choices.map(choice => {
              const active = state.current?.provider === choice.group.id && state.current.model === choice.model.id
              return (
                <button
                  key={choice.group.id + ':' + choice.model.id}
                  className="dsh-reasoning-model__option"
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={busy}
                  onClick={() => chooseModel(choice.group.id, choice.model.id)}
                >
                  <span className="dsh-reasoning-model__option-copy">
                    <span className="dsh-reasoning-model__option-name">{choice.model.name}</span>
                    {choice.model.description !== undefined && (
                      <span className="dsh-reasoning-model__option-description">{choice.model.description}</span>
                    )}
                  </span>
                  {active && <span className="dsh-reasoning-model__check" aria-hidden="true">✓</span>}
                </button>
              )
            })}
            {state.status === 'ready' && choices.length === 0 && (
              <div className="dsh-reasoning-model__status">{t('empty')}</div>
            )}
          </div>

          {reasoning !== undefined && (
            <section className="dsh-reasoning-effort" data-max={isMax}>
              <div className="dsh-reasoning-effort__header">
                <span>{t('label')}</span>
                <strong>{displaySelected?.name ?? t('unsupported')}</strong>
              </div>
              {efforts.length > 1 ? (
                <>
                  <div className="dsh-reasoning-effort__scale" aria-hidden="true">
                    <span>{t('efficient')}</span>
                    <span>{t('capable')}</span>
                  </div>
                  <EffortSlider
                    efforts={efforts}
                    index={displayIndex}
                    disabled={busy}
                    onChange={index => setLocalIndex(index)}
                    onCommit={commitEffort}
                  />
                </>
              ) : (
                <div className="dsh-reasoning-effort__single">{t('supported')}: {displaySelected?.name ?? t('unsupported')}</div>
              )}
            </section>
          )}

          {state.error !== null && (
            <div className="dsh-reasoning-model__error" role="status">{t('error', { message: state.error })}</div>
          )}
        </div>
      )}
    </div>
  )
}
