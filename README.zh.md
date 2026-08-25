# dsh-reasoning-effort

[![npm 版本](https://img.shields.io/npm/v/dsh-reasoning-effort?logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-reasoning-effort)
[![npm 下载量](https://img.shields.io/npm/dm/dsh-reasoning-effort?logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-reasoning-effort)
[![GitHub](https://img.shields.io/badge/GitHub-Mu--scorpio%2Fdsh--reasoning--effort-181717?logo=github)](https://github.com/Mu-scorpio/dsh-reasoning-effort)
[![许可证](https://img.shields.io/badge/license-MIT-79e5bd.svg)](LICENSE)

> 让自定义 DeepSeek Harness Provider 真正拥有可用、可控的推理强度。

`dsh-reasoning-effort` 是一个独立的 DSH Bundle，在 `llm-pi-ai` 的 settings
命名空间中补齐缺失的推理强度声明。它支持 Provider 默认值、按模型覆盖和
协议 wire 值映射，同时不会替换已有设置。

![dsh-reasoning-effort 配置概览](assets/reasoning-effort-overview.png)

_配置能力概览：插件负责补充设置，运行时界面和模型适配仍由 DSH 提供。_

![模型与推理强度弹窗](assets/reasoning-effort-popover.png)

_插件把模型选择和推理等级收进同一个清晰、紧凑的弹窗。_

![实时推理强度滑块](assets/reasoning-effort-slider.gif)

_GIF 展示滑块在离散档位间移动；到达最高档时会出现紫色辉光、边缘闪烁和扫光拖尾。_

## 它解决什么问题

不同 Provider 对同一个概念使用不同的词汇：有的接受 `low` / `medium` /
`high`，有的需要自己的字符串，还有的必须按模型单独处理。这个插件把它们
统一到 Harness 的推理强度等级，再把每个 Provider 实际需要的 wire 值映射出去。

它只做必要的配置工作：

- 为常见 DSH 适配协议提供按 Provider 识别的默认映射；
- 支持 Provider 级和模型级推理强度映射；
- 支持 Provider 级默认推理等级；
- 支持用 `disabled: true` 显式关闭某个模型的推理能力；
- 以追加方式更新 settings，保留已有声明。
- 在输入框发送按钮旁提供按模型变化的推理条；
- 与 DSH 自带模型菜单共用同一条选择路径；
- 最高档启用清晰的紫色特效，方便确认当前推理强度。

## 安装

将 npm 上已构建的 Bundle 安装到 DSH web profile，然后重启正在运行的 Harness：

```sh
dsh plugin --profile web add -w --config.auto-install-peers=false dsh-reasoning-effort
dsh web
```

包已经发布了预构建产物，正常安装不需要从源码编译插件。

## 配置

Bundle 已内置 `cliproxyapi` 和 `jyld` 的示例配置。需要配置其他 Provider 时，
在最终使用的 Cordis patch 中覆盖 `reasoning-effort` loader：

```yaml
- insert:
    - id: reasoning-effort
      name: dsh-reasoning-effort
      config:
        providers:
          my-provider:
            api: openai-responses
            reasoning: medium
            efforts:
              low: low
              medium: medium
              high: high
              xhigh: xhigh
              max: max
            models:
              my-reasoning-model:
                efforts:
                  high: reasoning_high
```

### 配置字段

| 字段 | 作用 |
| --- | --- |
| `api` | 选择 Provider 协议对应的默认 wire 值映射。 |
| `reasoning` | 仅在 Provider 没有该设置时，补充默认推理等级。 |
| `efforts` | 覆盖 Harness 各等级实际发送的字符串。 |
| `models.<id>.efforts` | 单独覆盖某个模型的映射。 |
| `models.<id>.disabled` | 显式标记某个模型不使用推理强度。 |

Harness 支持的等级为 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和
`max`。内置协议映射覆盖 `low` 到 `max` 五个常用等级；特殊网关可以自行提供
对应的实际值。

> Provider 必须已经存在于 `llm-pi-ai` settings 中。插件只增强现有 Provider，
> 不会重新创建已经被删除的 Provider。

## 默认安全策略

这个插件可以和已有 DSH 配置并排工作：

- 已有的 `reasoningEfforts` 永远不会被覆盖，包括 `false`；
- 模型中与推理无关的字段保持不变；
- `llm-pi-ai` 延迟注册时会短暂重试；
- settings 更新后会重新执行一次追加同步；
- 不新增 Provider 凭据、请求、工具或遥测。

换句话说，它只准备好 settings 契约，具体的模型控制仍交给 DSH 自己完成。

## 输入框推理条

浏览器端会读取当前模型公布的推理等级，把这些等级绘制成离散滑条，
并通过 DSH 共享的模型目录提交选择。拖动过程中，文字、填充条和最高档特效
只在前端实时更新；松手后才把最终位置提交给后端。没有推理元数据的模型不会
显示空控件。

## 本地开发

通过本地 overlay 运行与发布 Bundle 相同的配置：

```sh
pnpm install --config.auto-install-peers=false
npm run build
dsh web --patch ./cordis.yml
```

`cordis.yml` 会挂载 `src/index.ts`，并使用与 Bundle patch 相同的示例配置。

## 许可证

MIT
