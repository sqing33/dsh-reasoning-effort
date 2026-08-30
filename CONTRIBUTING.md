# 贡献指南

感谢你关注 `dsh-reasoning-effort`。提交改动前，请在 Node.js 22 或更高版本环境中完成构建和结构检查：

```sh
pnpm install --config.auto-install-peers=false
npm run build
npm run verify
```

其中：

- `src/reasoning-effort.ts` 和 `src/reasoning-protocols.ts` 负责推理强度配置与协议映射；
- `src/client/ReasoningBar.tsx` 和 `src/client/styles.ts` 负责 Web 输入框控件；
- `screenshots.json` 用于声明插件市场展示的截图，路径必须指向仓库内已有图片。

请保持改动聚焦，并在 Pull Request 中说明行为变化、兼容性影响和验证方式。不要提交凭据、个人配置或构建缓存。
