# DeepSeek Harness 推理强度插件

独立的 DeepSeek Harness 插件，为自定义 Provider 和模型补充可配置的推理强度
等级。插件只填写缺失的 llm-pi-ai 设置，不覆盖已有的手写值。

## 安装

将 DSH Bundle 安装到 web profile：

    dsh plugin --profile web add -w --config.auto-install-peers=false dsh-reasoning-effort
    dsh web

安装或更新后请重启正在运行的 Harness。

## 配置

Bundle 已内置 cliproxyapi 和 jyld 的常用配置。需要配置其他 Provider 时，在最终
应用的 cordis patch 中覆盖 reasoning-effort loader 的配置：

    - id: reasoning-effort
      name: dsh-reasoning-effort
      config:
        providers:
          cliproxyapi:
            api: openai-responses
            reasoning: high
            efforts:
              low: low
              medium: medium
              high: high
              xhigh: xhigh
              max: max
          jyld:
            api: openai-completions
            models:
              deepseek-v4-flash-0731:
                efforts:
                  low: low
                  medium: medium
                  high: high
                  xhigh: xhigh
                  max: max

配置规则：

- api 用于选择 Provider 协议的默认 wire 值映射；
- reasoning 设置 Provider 级默认推理等级；
- efforts 可以覆盖各等级实际发送的字符串；
- models.<id>.efforts 可以单独覆盖一个模型；
- models.<id>.disabled: true 可以显式关闭某个模型的推理能力；
- 已存在的 reasoningEfforts（包括 false）永远不会被覆盖；
- Provider 必须已经存在于 llm-pi-ai settings 中，插件不会重新创建已删除的
  Provider。

Harness 支持的等级为 off、minimal、low、medium、high、xhigh 和 max。内置协议
默认映射使用 low、medium、high、xhigh 和 max。

## 本地开发

在本仓库目录执行：

    dsh web --patch ./cordis.yml

本地 overlay 会以和发布 Bundle 相同的示例配置挂载 src/index.ts。

## 构建

    pnpm install --config.auto-install-peers=false
    pnpm build

## 工作方式

插件会等待 llm-pi-ai 注册 settings 命名空间，然后补齐缺失的 Provider、模型和
模型覆盖项。settings 更新后也会重新检查，适合 Provider 设置服务晚于插件启动的
组合。

## 许可证

MIT
