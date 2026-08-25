/** Localized copy for the model-seat reasoning control. */

export const zh = {
  label: '推理强度',
  model: '模型',
  chooseModel: '选择模型',
  menu: '模型与推理强度',
  efficient: '更高效',
  capable: '更智能',
  loading: '正在刷新模型列表…',
  empty: '没有可用的模型。',
  supported: '支持档位',
  unsupported: '不可用',
  aria: '推理强度：{effort}',
  hint: '打开模型菜单调整推理强度',
  error: '设置失败：{message}',
} as const

export type ReasoningKey = keyof typeof zh

export const en: Record<ReasoningKey, string> = {
  label: 'Reasoning',
  model: 'Model',
  chooseModel: 'Choose a model',
  menu: 'Model and reasoning effort',
  efficient: 'More efficient',
  capable: 'More capable',
  loading: 'Refreshing models…',
  empty: 'No models available.',
  supported: 'Supported effort',
  unsupported: 'Unavailable',
  aria: 'Reasoning effort: {effort}',
  hint: 'Open the model menu to adjust reasoning effort',
  error: 'Unable to update effort: {message}',
}
