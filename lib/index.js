import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region src/reasoning-protocols.ts
const REASONING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
const FIVE_LEVEL_EFFORTS = {
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "xhigh",
	max: "max"
};
/** Defaults for protocols supported by the Harness pi-ai adapter. */
const DEFAULT_EFFORTS_BY_API = {
	"openai-completions": FIVE_LEVEL_EFFORTS,
	"openai-responses": FIVE_LEVEL_EFFORTS,
	deepseek: FIVE_LEVEL_EFFORTS,
	openrouter: FIVE_LEVEL_EFFORTS,
	together: FIVE_LEVEL_EFFORTS,
	zai: FIVE_LEVEL_EFFORTS,
	qwen: FIVE_LEVEL_EFFORTS,
	"string-thinking": FIVE_LEVEL_EFFORTS,
	"ant-ling": FIVE_LEVEL_EFFORTS,
	anthropic: FIVE_LEVEL_EFFORTS
};
/** Fallback for an omitted or unknown provider API. */
const DEFAULT_EFFORTS = { ...FIVE_LEVEL_EFFORTS };
function defaultEffortsFor(api) {
	if (api !== void 0) {
		const found = DEFAULT_EFFORTS_BY_API[api];
		if (found !== void 0) return { ...found };
	}
	return { ...DEFAULT_EFFORTS };
}
/** Merge a user override over the protocol defaults. */
function mergeEfforts(base, override) {
	return override === void 0 ? { ...base } : {
		...base,
		...override
	};
}
//#endregion
//#region src/reasoning-effort.ts
const reasoningEfforts = z.dict(z.union([z.string(), z.const(null)]), z.union(REASONING_LEVELS));
const modelReasoningConfig = z.object({
	efforts: reasoningEfforts,
	disabled: z.boolean()
});
const providerReasoningConfig = z.object({
	api: z.string(),
	reasoning: z.union(REASONING_LEVELS),
	efforts: reasoningEfforts,
	models: z.dict(modelReasoningConfig)
});
const reasoningConfigSchema = z.object({ providers: z.dict(providerReasoningConfig) });
const PI_AI_NAMESPACE = settingsNamespace("llm-pi-ai");
const STARTUP_RETRY_DELAY_MS = 50;
const STARTUP_RETRY_LIMIT = 40;
function atPath(source, path) {
	let current = source;
	for (const key of path) {
		if (typeof current !== "object" || current === null || Array.isArray(current)) return void 0;
		current = current[key];
	}
	return current;
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringAt(value) {
	return typeof value === "string" ? value : void 0;
}
function effectiveEfforts(api, providerEfforts, modelEfforts) {
	return mergeEfforts(mergeEfforts(defaultEffortsFor(api), providerEfforts), modelEfforts);
}
function buildProviderOps(provider, providerConfig, current) {
	const ops = [];
	const providers = isRecord(current) ? atPath(current, ["providers"]) : void 0;
	const existingProvider = isRecord(providers) ? providers[provider] : void 0;
	const profile = isRecord(existingProvider) ? existingProvider : void 0;
	if (profile === void 0) return ops;
	const api = providerConfig.api ?? stringAt(profile.api);
	if (!(providerConfig.reasoning !== void 0 || providerConfig.efforts !== void 0 || providerConfig.models !== void 0 && Object.keys(providerConfig.models).length > 0)) return ops;
	if (providerConfig.reasoning !== void 0 && profile.reasoning === void 0) ops.push({
		op: "set",
		path: [
			"providers",
			provider,
			"reasoning"
		],
		value: providerConfig.reasoning
	});
	const models = profile.models;
	if (Array.isArray(models)) {
		let modelsChanged = false;
		const nextModels = models.map((entry) => {
			if (!isRecord(entry)) return entry;
			const modelId = entry.id;
			if (typeof modelId !== "string" || modelId.length === 0) return entry;
			const modelConfig = providerConfig.models?.[modelId];
			if (modelConfig?.disabled === true) {
				if (entry.reasoningEfforts === void 0) {
					modelsChanged = true;
					return {
						...entry,
						reasoningEfforts: false
					};
				}
				return entry;
			}
			if (entry.reasoningEfforts !== void 0) return entry;
			modelsChanged = true;
			return {
				...entry,
				reasoningEfforts: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts)
			};
		});
		if (modelsChanged) ops.push({
			op: "set",
			path: [
				"providers",
				provider,
				"models"
			],
			value: nextModels
		});
	}
	const overrides = profile.modelOverrides;
	if (isRecord(overrides)) for (const [modelId, override] of Object.entries(overrides)) {
		if (!isRecord(override)) continue;
		const modelConfig = providerConfig.models?.[modelId];
		if (modelConfig?.disabled === true) {
			if (override.reasoningEfforts === void 0) ops.push({
				op: "set",
				path: [
					"providers",
					provider,
					"modelOverrides",
					modelId,
					"reasoningEfforts"
				],
				value: false
			});
			continue;
		}
		if (override.reasoningEfforts !== void 0) continue;
		ops.push({
			op: "set",
			path: [
				"providers",
				provider,
				"modelOverrides",
				modelId,
				"reasoningEfforts"
			],
			value: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts)
		});
	}
	return ops;
}
async function syncReasoningSettings(ctx, config) {
	const current = ctx.settings.get(PI_AI_NAMESPACE);
	if (current === void 0) return false;
	const ops = [];
	for (const [provider, providerConfig] of Object.entries(config.providers ?? {})) ops.push(...buildProviderOps(provider, providerConfig, current));
	if (ops.length === 0) return true;
	try {
		await ctx.settings.mutate(PI_AI_NAMESPACE, ops);
		ctx.logger.info("[dsh-reasoning-effort] wrote %d reasoning-effort setting(s)", ops.length);
	} catch (error) {
		ctx.logger.warn("[dsh-reasoning-effort] could not update llm-pi-ai settings");
		ctx.logger.warn(error);
	}
	return true;
}
function applyReasoningEffort(ctx, config = {}) {
	let startupAttempts = 0;
	const sync = () => {
		syncReasoningSettings(ctx, config).then((ready) => {
			if (ready || startupAttempts >= STARTUP_RETRY_LIMIT) return;
			startupAttempts += 1;
			setTimeout(sync, STARTUP_RETRY_DELAY_MS);
		}).catch((error) => {
			ctx.logger.warn("[dsh-reasoning-effort] reasoning-effort sync failed");
			ctx.logger.warn(error);
		});
	};
	setTimeout(sync, 0);
	ctx.on("settings/updated", (namespace) => {
		if (namespace === PI_AI_NAMESPACE) sync();
	});
}
//#endregion
//#region src/index.ts
const name = "reasoning-effort";
const inject = ["settings"];
const Config = reasoningConfigSchema;
function apply(ctx, config = {}) {
	applyReasoningEffort(ctx, config);
}
//#endregion
export { Config, apply, inject, name };
