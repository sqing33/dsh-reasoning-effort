# 更新日志

## 0.2.8

- 将所有 DSH 宿主 peer 标记为 optional，避免 pnpm 从 npm 自动安装未公开的 Harness 内部包。
- 不再导入 DSH 0.1.6 已移除的 `settingsNamespace` 运行时辅助函数。
- 声明模型目录所需的 `remote.session` 客户端注入，修复推理控件在会话页崩溃。
- 普通安装不再需要 `--config.auto-install-peers=false` 临时参数。
- 发布前会同时运行构建、测试和包结构验证。

## 0.2.7

- 默认自动发现并处理 `llm-pi-ai` 中的全部现有 Provider，不再依赖 `cliproxyapi` 和 `jyld` 示例名称。
- 增加全局 `defaults`、Provider 排除项和 `auto: false` 兼容模式。
- 增加陌生 Provider、已有声明保留、覆盖合并和显式白名单模式的回归测试。

## 0.2.6

- 增加按 Provider 分组的模型选择器。
- 增加粗轨道、离散档位的推理强度滑块。
- 最高推理档位增加紫色辉光、边缘闪烁和拖尾效果。
- 模型切换先在前端暂存，关闭选择框时再提交到后端，避免界面闪回。
- 修复模型列表滚动时的悬停闪烁。
- 支持 Provider 默认值、模型级覆盖和协议 wire 值映射。
