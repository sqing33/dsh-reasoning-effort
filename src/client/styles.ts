/** Self-contained Codex-style model-seat and reasoning-effort styles. */

const STYLE_ID = 'dsh-reasoning-effort-styles'
const PLUGIN_ID = 'dsh-reasoning-effort'

const CSS = `
.dsh-reasoning-model{position:relative;z-index:4;display:flex;min-width:0;max-width:min(100%,420px);align-items:center}
.dsh-reasoning-model__trigger{box-sizing:border-box;display:flex;min-width:0;max-width:100%;height:32px;align-items:center;gap:6px;padding:0 7px 0 9px;border:1px solid transparent;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,#f1f2f4);color:var(--dsw-alias-label-secondary,#4f5867);font:inherit;font-size:11px;font-weight:500;line-height:17px;cursor:pointer;transition:background-color .14s ease,border-color .14s ease,box-shadow .14s ease}
.dsh-reasoning-model__trigger:hover:not(:disabled){border-color:var(--dsw-alias-border-l2,#d8dce3);background:var(--dsw-alias-interactive-bg-hover,#eceef1)}
.dsh-reasoning-model__trigger:focus-visible{outline:0;border-color:var(--dsw-alias-state-business-primary,#3b82f6);box-shadow:0 0 0 3px rgb(59 130 246 / 18%)}
.dsh-reasoning-model__trigger:disabled{color:var(--dsw-alias-label-dimmed,#a1a7b1);cursor:default;opacity:.72}
.dsh-reasoning-model__bolt{width:16px;height:16px;flex:none;color:var(--dsw-alias-label-primary,#17191d)}
.dsh-reasoning-model__model{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-reasoning-model__effort{display:inline-flex;min-width:0;align-items:center;gap:4px;color:var(--dsw-alias-state-business-primary,#3b82f6);font-weight:600;white-space:nowrap}
.dsh-reasoning-model__effort-label{color:var(--dsw-alias-label-tertiary,#7d8592);font-weight:500}
.dsh-reasoning-model[data-max='true'] .dsh-reasoning-model__effort{color:#9751e8}
.dsh-reasoning-model__chevron{width:15px;height:15px;flex:none;color:var(--dsw-alias-label-tertiary,#838b98);transition:transform .14s ease}
.dsh-reasoning-model__chevron[data-open='true']{transform:rotate(180deg)}
.dsh-reasoning-model__popover{position:absolute;right:0;bottom:calc(100% + 9px);box-sizing:border-box;width:min(360px,calc(100vw - 24px));max-height:min(600px,calc(100vh - 96px));overflow:auto;padding:12px;border:1px solid var(--dsw-alias-border-l2,#d9dde4);border-radius:16px;background:var(--dsw-specific-menu,#fff);box-shadow:0 12px 30px rgb(20 28 42 / 14%),0 3px 10px rgb(20 28 42 / 8%);color:var(--dsw-alias-label-primary,#17191d)}
.dsh-reasoning-model__model-head{display:flex;min-width:0;align-items:baseline;justify-content:space-between;gap:14px;padding:0 4px 10px}
.dsh-reasoning-model__section-label{color:var(--dsw-alias-label-primary,#17191d);font-size:11px;font-weight:600;white-space:nowrap}
.dsh-reasoning-model__model-head-value{min-width:0;overflow:hidden;color:var(--dsw-alias-label-secondary,#5b6472);font-size:11px;text-overflow:ellipsis;white-space:nowrap}
.dsh-reasoning-model__models{display:flex;max-height:174px;flex-direction:column;gap:2px;overflow:auto;padding:2px 0 4px}
.dsh-reasoning-model__option{display:flex;width:100%;min-height:38px;align-items:center;gap:9px;padding:6px 8px;border:0;border-radius:10px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-reasoning-model__option:hover:not(:disabled),.dsh-reasoning-model__option[aria-selected='true']{background:var(--dsw-alias-interactive-bg-hover,#f2f3f5)}
.dsh-reasoning-model__option:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#3b82f6);outline-offset:-2px}
.dsh-reasoning-model__option:disabled{color:var(--dsw-alias-label-dimmed,#a1a7b1);cursor:wait}
.dsh-reasoning-model__option-copy{display:flex;min-width:0;flex:1;flex-direction:column}
.dsh-reasoning-model__option-name{overflow:hidden;font-size:11px;font-weight:550;line-height:16px;text-overflow:ellipsis;white-space:nowrap}
.dsh-reasoning-model__option-description{overflow:hidden;color:var(--dsw-alias-label-tertiary,#858d99);font-size:9px;line-height:14px;text-overflow:ellipsis;white-space:nowrap}
.dsh-reasoning-model__check{flex:none;color:var(--dsw-alias-state-business-primary,#3b82f6);font-size:13px;font-weight:700}
.dsh-reasoning-model__status{padding:10px 8px;color:var(--dsw-alias-label-tertiary,#858d99);font-size:10px;line-height:15px}
.dsh-reasoning-effort{margin-top:6px;padding:12px 4px 2px;border-top:1px solid var(--dsw-alias-border-l1,#eceef1)}
.dsh-reasoning-effort__header{display:flex;align-items:baseline;justify-content:space-between;gap:10px;color:var(--dsw-alias-label-secondary,#616a78);font-size:10px;line-height:16px}
.dsh-reasoning-effort__header strong{color:var(--dsw-alias-state-business-primary,#3b82f6);font-size:11px;font-weight:650}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__header strong{color:#9751e8}
.dsh-reasoning-effort__scale{display:flex;align-items:center;justify-content:space-between;margin:7px 2px 0;color:var(--dsw-alias-label-tertiary,#858d99);font-size:9px;line-height:13px}
.dsh-reasoning-effort__slider{height:40px;margin:1px 0 2px;touch-action:none;cursor:grab;outline:0}
.dsh-reasoning-effort__slider:active,.dsh-reasoning-effort__slider[data-dragging='true']{cursor:grabbing}
.dsh-reasoning-effort__slider:focus-visible{border-radius:12px;box-shadow:0 0 0 3px rgb(59 130 246 / 18%)}
.dsh-reasoning-effort__range{position:relative;height:40px;margin:0 15px}
.dsh-reasoning-effort__rail{position:absolute;top:50%;right:0;left:0;height:24px;transform:translateY(-50%);border-radius:12px;background:#e7e7e9;box-shadow:inset 0 1px 2px rgb(25 30 40 / 7%)}
.dsh-reasoning-effort__fill{position:absolute;z-index:1;top:50%;left:0;height:24px;min-width:0;transform:translateY(-50%);border-radius:12px;background:linear-gradient(90deg,#339cff 0%,#3d8df7 100%);box-shadow:inset 0 1px 1px rgb(255 255 255 / 14%);transition:width .2s cubic-bezier(.2,.8,.3,1)}
.dsh-reasoning-effort__fill::after{position:absolute;top:0;right:auto;bottom:0;left:-40%;width:35%;border-radius:999px;background:linear-gradient(105deg,transparent 0%,rgb(255 255 255 / 0%) 20%,rgb(255 255 255 / 84%) 50%,rgb(221 200 255 / 32%) 80%,transparent 100%);content:'';filter:blur(2px);opacity:0}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__fill{background:linear-gradient(90deg,#326fff 0%,#7057e9 56%,#a855f7 100%);overflow:hidden;animation:dsh-reasoning-max-flash 1.05s ease-in-out infinite}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__fill::after{opacity:1;animation:dsh-reasoning-max-sweep .95s linear infinite}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__fill::before{position:absolute;top:-10px;right:-12px;bottom:-10px;width:32px;border-radius:50%;background:rgb(224 201 255 / 76%);content:'';filter:blur(8px);opacity:.9;animation:dsh-reasoning-max-tail .82s ease-in-out infinite}
.dsh-reasoning-effort__tick{position:absolute;z-index:2;top:50%;width:5px;height:5px;border-radius:50%;transform:translate(-50%,-50%);background:#b8b9bd;transition:background-color .16s ease,transform .16s ease}
.dsh-reasoning-effort__tick[data-active='true']{background:#7bbdff}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__tick[data-active='true']{background:#c29af6}
.dsh-reasoning-effort__tick[data-major='true']{width:8px;height:8px;transform:translate(-50%,-50%);background:#fff;box-shadow:0 0 0 1px rgb(59 130 246 / 28%)}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__tick[data-major='true']{box-shadow:0 0 0 1px rgb(168 85 247 / 40%)}
.dsh-reasoning-effort__thumb{position:absolute;z-index:3;top:50%;width:30px;height:30px;margin-left:0;transform:translate(-50%,-50%);border:1px solid #dadadd;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgb(20 30 50 / 12%),0 3px 8px rgb(20 30 50 / 8%);transition:left .18s cubic-bezier(.2,.9,.25,1),box-shadow .18s ease,transform .18s ease}
.dsh-reasoning-effort__slider:hover .dsh-reasoning-effort__thumb{box-shadow:0 1px 2px rgb(20 30 50 / 14%),0 4px 10px rgb(20 30 50 / 10%);transform:translate(-50%,-50%) scale(1.04)}
.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__thumb{border-color:#cdb2ef;box-shadow:0 0 0 3px rgb(168 85 247 / 14%),0 0 16px rgb(168 85 247 / 58%),0 2px 6px rgb(20 30 50 / 12%);animation:dsh-reasoning-max-pulse 1.35s ease-in-out infinite}
.dsh-reasoning-effort__single{padding:9px 0 2px;color:var(--dsw-alias-label-tertiary,#858d99);font-size:10px}
.dsh-reasoning-model__error{margin:8px 4px 2px;padding:7px 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger,#fff1f2);color:var(--dsw-alias-state-error-primary,#d92d48);font-size:9px;line-height:14px}
@keyframes dsh-reasoning-max-flash{0%,100%{filter:saturate(1) brightness(1);box-shadow:inset 0 1px 1px rgb(255 255 255 / 14%),0 0 6px rgb(168 85 247 / 20%)}50%{filter:saturate(1.45) brightness(1.16);box-shadow:inset 0 1px 1px rgb(255 255 255 / 24%),0 0 16px rgb(168 85 247 / 72%),0 0 30px rgb(192 132 252 / 28%)}}
@keyframes dsh-reasoning-max-tail{0%,100%{opacity:.35;transform:scale(.78)}50%{opacity:1;transform:scale(1.15)}}
@keyframes dsh-reasoning-max-sweep{0%{transform:translateX(-130%);opacity:0}25%{opacity:.85}75%{opacity:.85}100%{transform:translateX(520%);opacity:0}}
@keyframes dsh-reasoning-max-pulse{0%,100%{filter:saturate(1);transform:translate(-50%,-50%) scale(1)}50%{filter:saturate(1.35) brightness(1.12);transform:translate(-50%,-50%) scale(1.1)}}
@media (max-width:760px){.dsh-reasoning-model__trigger{max-width:calc(100vw - 90px)}.dsh-reasoning-model__effort-label{display:none}.dsh-reasoning-model__popover{right:-6px;width:min(340px,calc(100vw - 20px))}}
@media (prefers-reduced-motion:reduce){.dsh-reasoning-model__chevron,.dsh-reasoning-effort__fill,.dsh-reasoning-effort__thumb{transition:none}.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__fill,.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__fill::after,.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__fill::before,.dsh-reasoning-effort[data-max='true'] .dsh-reasoning-effort__thumb{animation:none}}
`

/** Mount the stylesheet for the owning plugin lifetime. */
export function installReasoningStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.dataset.plugin = PLUGIN_ID
  style.dataset.pluginCss = PLUGIN_ID + '/reasoning-model.css'
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
