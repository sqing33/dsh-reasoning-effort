# DeepSeek Harness Reasoning Effort

Standalone DeepSeek Harness plugin for adding configurable reasoning-effort
levels to custom providers and models. It updates the llm-pi-ai settings
namespace only when a declaration is missing, so hand-written settings remain
untouched.

## Install

Install the DSH Bundle into the web profile:

    dsh plugin --profile web add -w --config.auto-install-peers=false dsh-reasoning-effort
    dsh web

Restart the running Harness after installation or an update.

## Configuration

The Bundle includes common defaults for cliproxyapi and jyld. To configure
another provider, add a config override for the reasoning-effort loader in
your final cordis patch:

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

Configuration rules:

- api selects the default wire-value mapping for a provider protocol.
- reasoning sets a provider-level default reasoning level.
- efforts overrides the wire values sent for each level.
- models.<id>.efforts overrides the mapping for one model.
- models.<id>.disabled: true explicitly disables reasoning for that model.
- Existing reasoningEfforts values, including false, are never overwritten.
- Providers must already exist in the llm-pi-ai settings; this plugin does not
  recreate removed providers.

Supported Harness levels are off, minimal, low, medium, high, xhigh, and max.
The built-in protocol defaults use low, medium, high, xhigh, and max.

## Local development

From this checkout:

    dsh web --patch ./cordis.yml

The local overlay mounts src/index.ts with the same example configuration as
the published Bundle.

## Build

    pnpm install --config.auto-install-peers=false
    pnpm build

## How it works

The plugin waits briefly for llm-pi-ai to register its settings namespace,
then fills missing provider, model, and model-override declarations. It also
rechecks the namespace after settings updates, which makes it safe to use in
compositions where the provider settings service starts later.

## License

MIT
