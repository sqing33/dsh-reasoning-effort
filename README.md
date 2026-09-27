# dsh-reasoning-effort

[![npm 版本](https://img.shields.io/npm/v/dsh-reasoning-effort?logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-reasoning-effort)
[![npm 下载量](https://img.shields.io/npm/dm/dsh-reasoning-effort?logo=npm&logoColor=white)](https://www.npmjs.com/package/dsh-reasoning-effort)
[![GitHub](https://img.shields.io/badge/GitHub-Mu--scorpio%2Fdsh--reasoning--effort-181717?logo=github)](https://github.com/Mu-scorpio/dsh-reasoning-effort)
[![许可证](https://img.shields.io/badge/license-MIT-79e5bd.svg)](LICENSE)

> 为 DeepSeek Harness 中的任意模型设置推理强度，并在最高档点亮紫色动态特效。
>
> **这是 `Mu-scorpio/dsh-reasoning-effort` 的 fork**，在此基础上把推理档位
> **强制写入 profile patch**，见[强制档位改写](#强制档位改写)。上游功能完整保留。

`dsh-reasoning-effort` 用来补齐和管理模型的推理强度配置。不限制 Provider 或模型品牌：只要模型已经接入 DeepSeek Harness，就可以为它声明默认等级、模型级覆盖和实际协议值映射。

![模型选择器与最高推理强度特效](assets/reasoning-effort-model-picker-max.png)

_模型选择器按 Provider 折叠分组；可以为任意已接入模型配置推理强度，滑到最高级时会出现紫色辉光、边缘闪烁和拖尾特效。_

![推理强度滑块动效](assets/reasoning-effort-slider.gif)

_滑块会实时显示当前档位；到达最高级时，紫色发光效果会持续提示当前状态。_

## 核心能力

- 为任意已接入 Harness 的模型配置推理强度，不受 Provider 限制；
- 零配置自动发现当前 `llm-pi-ai` 中的全部现有 Provider；
- 支持 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和 `max` 等等级；
- 支持 Provider 默认值、模型级覆盖和协议 wire 值映射；
- 模型选择器按 Provider 分组折叠，先选 Provider，再选模型；
- 推理强度滑块采用粗轨道和离散档位，最高档带紫色辉光、闪烁和拖尾；
- 模型切换先在前端暂存，关闭选择框时再提交，避免界面闪回；
- 以追加方式更新 settings，不覆盖已有声明；
- **强制把推理档位写进 profile patch**，使声明式配置也一定生效（见下文）。

## 安装

将 npm 上已构建的 Bundle 安装到 DSH web profile，然后重启正在运行的 Harness：

```sh
dsh plugin --profile web add -w dsh-reasoning-effort
dsh web
```

包已经发布了预构建产物，正常安装不需要从源码编译插件。

## 配置

默认不需要写 Provider 名称。插件会从 `llm-pi-ai` settings 自动发现当前电脑上已经存在的全部 Provider，并为其中缺少声明的模型补齐通用推理档位。因此，Bundle 不再把 `cliproxyapi`、`jyld` 或任何其他名称当作默认白名单。

只有特殊网关需要不同 wire 值、需要排除某个 Provider，或需要单独处理模型时，才在 Cordis patch 中加入覆盖：

```yaml
- insert:
    - id: reasoning-effort
      name: dsh-reasoning-effort
      config:
        defaults:
          reasoning: medium
        providers:
          special-provider:
            api: openai-responses
            efforts:
              high: reasoning_high
            models:
              non-reasoning-model:
                disabled: true
          excluded-provider:
            disabled: true
```

### 配置字段

| 字段 | 作用 |
| --- | --- |
| `auto` | 是否自动发现全部现有 Provider，默认 `true`；设为 `false` 时只处理 `providers` 中显式列出的项。 |
| `force` | 是否改写 profile patch 强制档位，默认 `true`；设为 `false` 则完全不碰 `cordis.patch.yml`。 |
| `defaults.api` | 当 Provider 自身没有 `api` 时使用的协议回退值。 |
| `defaults.reasoning` | 为所有 Provider 补充默认推理等级，但不覆盖已有值。 |
| `defaults.efforts` | 覆盖所有 Provider 的通用 wire 值映射。 |
| `providers.<id>.api` | 为指定 Provider 选择协议默认映射。 |
| `providers.<id>.reasoning` | 为指定 Provider 补充默认推理等级。 |
| `providers.<id>.efforts` | 覆盖指定 Provider 的 wire 值映射。 |
| `providers.<id>.disabled` | 排除指定 Provider。 |
| `providers.<id>.models.<model-id>.efforts` | 单独覆盖某个模型的映射。 |
| `providers.<id>.models.<model-id>.disabled` | 显式标记某个模型不使用推理强度。 |

Harness 支持的等级为 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和 `max`。内置协议映射覆盖 `low` 到 `max` 五个常用等级；特殊网关可以自行提供对应的实际值。

> Provider 必须已经存在于 `llm-pi-ai` settings 中。插件只增强现有 Provider，不会重新创建已经被删除的 Provider。

## 输入框推理条

浏览器端会读取当前模型公布的推理等级，把这些等级绘制成离散滑块，并通过 DSH 共享的模型目录提交选择。拖动过程中，文字、填充条和最高档特效在前端实时更新；松手后才把最终强度提交给后端。

模型选择器中的模型切换也采用前端暂存机制：点击模型时立即更新界面，但不会立即改写后台模型；关闭选择框时，最后选中的模型和推理强度才会一起提交。这样可以避免后台旧状态回写造成闪回。

没有推理元数据的模型不会显示空控件。

## 强制档位改写

上游插件只写 settings 命名空间。当模型列表是在 profile 的
`cordis.patch.yml` 里声明出来的时候，**那个文件才是真正的来源，settings 层的
写入看不见**——滑块会一直停在 patch 里写死的那几档。

本 fork 在 `apply()` 里额外做一件事：**直接打开 `cordis.patch.yml`，把
`llm-pi-ai` 下每个模型的 `reasoningEfforts` 重写成统一档位**。文件里原本写
`{high, max}` 还是别的，都会被覆盖。

默认档位是 5 档：`off`、`medium`、`high`、`xhigh`、`max`。

改档位只需要在最终使用的 patch 里配置插件：

```yaml
- insert:
    - id: reasoning-effort
      name: dsh-reasoning-effort
      config:
        defaults:
          efforts:
            off: off
            medium: medium
            high: high
            xhigh: xhigh
            max: max
```

`defaults.efforts` 会与内置默认值合并，所以只写你要改的键即可。
`config.force: false` 可以完全关掉这个改写行为，让插件退回上游的纯 settings 模式。

实现细节：

- 只重写 `reasoningEfforts` 那一段，模型的其他字段和文件里其他条目一律不动；
- 内容没变化就不写盘，重复启动不会反复改文件（幂等）；
- 文件布局不认得时原样返回，不做任何猜测；
- 显式 `disabled: true` 的模型仍然被尊重（拿到 `false` 而不是档位表）；
- 日志会记录一次 `[dsh-reasoning-effort] forced N reasoning tier(s) into ...`。

> ⚠️ 这意味着插件启动时会写你的 `cordis.patch.yml`。如果你更希望配置完全由手写
> 文件掌控，就用 `force: false`，或者直接不用这个 fork。

## 默认安全策略

在 `force: false`（或没有 profile patch）时，插件和已有 DSH 配置并排工作：

- `llm-pi-ai` 延迟注册时会短暂重试；
- settings 更新后会重新执行一次追加同步；
- 不新增 Provider 凭据、请求、工具或遥测。

开启 `force`（默认）后，行为有意为之地更激进：

- 已有 `reasoningEfforts` **会被覆盖**，包括写死的 `false`；
- 只影响档位声明，模型的其他字段保持不变；
- 唯一豁免是显式的 `providers.<id>.models.<model-id>.disabled: true`。

## 本地开发

通过本地 overlay 运行与发布 Bundle 相同的配置：

```sh
pnpm install
npm run build
dsh web --patch ./cordis.yml
```

`cordis.yml` 会挂载 `src/index.ts`，并使用与 Bundle patch 相同的零配置自动发现行为。

## 许可证

MIT
