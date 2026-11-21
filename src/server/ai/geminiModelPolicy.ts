import { GoogleGenAI } from '@google/genai';

/**
 * Verified active free-tier text models compatible with @google/genai@^3.6.1.
 * Source of truth: installed SDK + Gemini API active model registry.
 */
export const VERIFIED_PRIMARY_TEXT_MODEL = 'gemini-4-hydrogen';
export const VERIFIED_FALLBACK_TEXT_MODEL = 'gemini-3.1-flash-lite';
export const VERIFIED_TEXT_FALLBACK_CHAIN = [
  VERIFIED_PRIMARY_TEXT_MODEL,
  VERIFIED_FALLBACK_TEXT_MODEL
] as const;

/**
 * Explicitly deprecated / prohibited models that must never be selected.
 */
const PROHIBITED_DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking'
]);

const NON_TEXT_MODEL_PATTERNS = [
  /-tts\b/i,
  /-image\b/i,
  /-transcribe/i,
  /-live\b/i,
  /-embedding/i,
  /^gemini-omni/i,
  /^lyria-/i,
  /^genie-/i,
  /^gemini-decision/i
];

export type GeminiErrorCategory =
  | 'auth_invalid'
  | 'quota_exhausted'
  | 'model_unavailable'
  | 'timeout'
  | 'transient_service'
  | 'bad_request'
  | 'unknown';

export interface ClassifiedGeminiError {
  category: GeminiErrorCategory;
  retryable: boolean;
  httpStatus: number;
  canRetry: boolean;
  userMessage: string;
}

export interface ResolvedModelPlan {
  primaryModel: string;
  candidates: string[];
  configuredEnvModel: string | null;
}

export interface GeminiTextGenerationSuccess {
  ok: true;
  text: string;
  rawResponse: any;
  modelUsed: string;
  fallbackUsed: boolean;
  attemptedModels: string[];
}

export interface GeminiTextGenerationFailure {
  ok: false;
  errorCategory: GeminiErrorCategory;
  httpStatus: number;
  canRetry: boolean;
  userMessage: string;
  attemptedModels: string[];
}

export type GeminiTextGenerationOutcome =
  | GeminiTextGenerationSuccess
  | GeminiTextGenerationFailure;

export type GeminiGenerateContentFn = (params: {
  apiKey: string;
  model: string;
  contents: any;
  config?: Record<string, any>;
}) => Promise<any>;

let testGenerateOverride: GeminiGenerateContentFn | null = null;

/**
 * Strictly for automated test suites to inject deterministic provider responses
 * without making live external API calls. Always null in production.
 */
export function setGeminiGenerateOverrideForTesting(fn: GeminiGenerateContentFn | null): void {
  testGenerateOverride = fn;
}

/**
 * Validates and normalizes a text Gemini model identifier.
 * Rejects blank strings, malformed IDs, deprecated models, and non-text modality models.
 */
export function normalizeGeminiTextModelId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('models/')) {
    cleaned = cleaned.slice('models/'.length).trim();
  }
  const normalized = cleaned.toLowerCase();

  if (!/^gemini-[a-z0-9][a-z0-9._-]{1,63}$/.test(normalized)) {
    return null;
  }
  if (
    PROHIBITED_DEPRECATED_MODELS.has(normalized) ||
    normalized.startsWith('gemini-1.5-') ||
    normalized.startsWith('gemini-2.0-')
  ) {
    return null;
  }
  if (NON_TEXT_MODEL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }
  return normalized;
}

/**
 * Resolves an environment-aware, bounded model selection plan:
 * 1. Valid explicit per-request model (when provided by an endpoint that supports selection)
 * 2. Valid configured GEMINI_MODEL environment variable
 * 3. Verified active free-tier fallback chain (gemini-4-hydrogen -> gemini-3.1-flash-lite)
 *
 * Capped at 3 unique candidates to bound worst-case latency and prevent runaway retries.
 */
export function resolveTextModelCandidates(options?: {
  requestedModel?: unknown;
  envModel?: string | undefined;
}): ResolvedModelPlan {
  const rawEnv = options?.envModel !== undefined ? options.envModel : process.env.GEMINI_MODEL;
  const configuredEnvModel = normalizeGeminiTextModelId(rawEnv);
  const requested = normalizeGeminiTextModelId(options?.requestedModel);

  const ordered: string[] = [];
  const pushUnique = (modelId: string | null) => {
    if (modelId && !ordered.includes(modelId)) {
      ordered.push(modelId);
    }
  };

  pushUnique(requested);
  pushUnique(configuredEnvModel);
  for (const verified of VERIFIED_TEXT_FALLBACK_CHAIN) {
    pushUnique(verified);
  }

  const candidates = ordered.slice(0, 3);
  return {
    primaryModel: candidates[0],
    candidates,
    configuredEnvModel
  };
}

/**
 * Strips model-incompatible sampling/thinking parameters for Gemini 4 series models
 * (temperature, topP, topK, candidateCount, thinkingBudget are rejected/deprecated on gemini-4-*).
 */
export function sanitizeConfigForModel(
  model: string,
  config?: Record<string, any>
): Record<string, any> | undefined {
  if (!config || typeof config !== 'object') return undefined;
  const clone: Record<string, any> = { ...config };

  if (model.startsWith('gemini-4-')) {
    delete clone.temperature;
    delete clone.topP;
    delete clone.topK;
    delete clone.candidateCount;
    if (clone.thinkingConfig && typeof clone.thinkingConfig === 'object') {
      const tc = { ...clone.thinkingConfig };
      delete tc.thinkingBudget;
      if (Object.keys(tc).length > 0) {
        clone.thinkingConfig = tc;
      } else {
        delete clone.thinkingConfig;
      }
    }
  }

  return clone;
}

/**
 * Classifies Gemini SDK/HTTP errors into actionable, non-leaking categories.
 * - Auth / API key / permission failures: never retried with fallback models.
 * - Quota exhaustion (429 / RESOURCE_EXHAUSTED): never retried uncontrollably.
 * - Model not found (404) / timeouts / transient 5xx: eligible for verified fallback.
 */
export function classifyGeminiError(err: unknown): ClassifiedGeminiError {
  const errObj = err as any;
  const statusNum = Number(
    errObj?.status ?? errObj?.statusCode ?? errObj?.response?.status ?? errObj?.error?.code ?? NaN
  );
  const rawMessage = String(errObj?.message || errObj?.error?.message || err || '');
  const upper = rawMessage.toUpperCase();

  // 1. Invalid API key or permission failure — DO NOT retry across fallback models
  if (
    statusNum === 401 ||
    statusNum === 403 ||
    upper.includes('API_KEY_INVALID') ||
    upper.includes('API KEY NOT VALID') ||
    upper.includes('INVALID API KEY') ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('UNAUTHENTICATED') ||
    (statusNum === 400 && upper.includes('API KEY'))
  ) {
    return {
      category: 'auth_invalid',
      retryable: false,
      httpStatus: 503,
      canRetry: false,
      userMessage:
        'AI service authentication failed. Please contact the administrator to verify the server Gemini API key.'
    };
  }

  // 2. Quota / rate-limit exhaustion — DO NOT loop across fallbacks
  if (
    statusNum === 429 ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('QUOTA') ||
    upper.includes('TOO MANY REQUESTS') ||
    upper.includes('RATE LIMIT') ||
    upper.includes('RATE_LIMIT')
  ) {
    return {
      category: 'quota_exhausted',
      retryable: false,
      httpStatus: 429,
      canRetry: true,
      userMessage:
        'AI evaluation quota is temporarily exhausted. Please wait a moment and try again.'
    };
  }

  // 3. Model unavailable / unsupported — eligible for verified fallback
  if (
    statusNum === 404 ||
    upper.includes('NOT_FOUND') ||
    upper.includes('NOT FOUND') ||
    upper.includes('IS NOT SUPPORTED') ||
    upper.includes('UNSUPPORTED MODEL') ||
    upper.includes('UNKNOWN MODEL') ||
    upper.includes('MODEL_NOT_FOUND')
  ) {
    return {
      category: 'model_unavailable',
      retryable: true,
      httpStatus: 503,
      canRetry: true,
      userMessage:
        'The configured AI model is temporarily unavailable. Please try again in a moment.'
    };
  }

  // 4. Timeout — eligible for verified fallback (bounded by candidate list)
  if (
    errObj?.name === 'AbortError' ||
    errObj?.code === 'ETIMEDOUT' ||
    upper.includes('DEADLINE_EXCEEDED') ||
    upper.includes('TIMED OUT') ||
    upper.includes('TIMEOUT')
  ) {
    return {
      category: 'timeout',
      retryable: true,
      httpStatus: 502,
      canRetry: true,
      userMessage:
        'AI evaluation service timed out before completing the response. Please retry.'
    };
  }

  // 5. Transient upstream / network error — eligible for verified fallback
  if (
    statusNum === 500 ||
    statusNum === 502 ||
    statusNum === 503 ||
    statusNum === 504 ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('INTERNAL') ||
    upper.includes('OVERLOADED') ||
    upper.includes('ECONNRESET') ||
    upper.includes('ECONNREFUSED') ||
    upper.includes('ENOTFOUND') ||
    upper.includes('FETCH FAILED')
  ) {
    return {
      category: 'transient_service',
      retryable: true,
      httpStatus: 502,
      canRetry: true,
      userMessage:
        'AI evaluation service is temporarily unavailable. Please retry in a moment.'
    };
  }

  // 6. Client/schema bad request (non-auth 400) — do not spam fallbacks
  if (statusNum === 400 || upper.includes('INVALID_ARGUMENT')) {
    return {
      category: 'bad_request',
      retryable: false,
      httpStatus: 502,
      canRetry: false,
      userMessage:
        'AI evaluation request could not be processed. Please check your submission and try again.'
    };
  }

  return {
    category: 'unknown',
    retryable: true,
    httpStatus: 502,
    canRetry: true,
    userMessage:
      'AI evaluation service failed unexpectedly. Please try again in a moment.'
  };
}

/**
 * Executes a Gemini text generation request using the resolved environment-aware
 * model chain, per-attempt timeout bounds, and strict non-retry rules for auth/quota errors.
 */
export async function generateContentWithFallback(params: {
  apiKey: string;
  contents: any;
  config?: Record<string, any>;
  requestedModel?: unknown;
  envModel?: string | undefined;
  timeoutMs?: number;
  taskLabel?: string;
  generateFn?: GeminiGenerateContentFn;
}): Promise<GeminiTextGenerationOutcome> {
  const {
    apiKey,
    contents,
    config,
    requestedModel,
    envModel,
    timeoutMs = 18_000,
    taskLabel = 'gemini_text',
    generateFn
  } = params;

  const plan = resolveTextModelCandidates({ requestedModel, envModel });
  const attemptedModels: string[] = [];

  const activeGenerator: GeminiGenerateContentFn =
    generateFn ||
    testGenerateOverride ||
    (async ({ apiKey: key, model, contents: reqContents, config: reqConfig }) => {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      return ai.models.generateContent({
        model,
        contents: reqContents,
        config: reqConfig
      });
    });

  let lastFailure: ClassifiedGeminiError = {
    category: 'transient_service',
    retryable: true,
    httpStatus: 502,
    canRetry: true,
    userMessage: 'AI evaluation service is currently unavailable. Please retry.'
  };

  for (let idx = 0; idx < plan.candidates.length; idx++) {
    const candidateModel = plan.candidates[idx];
    attemptedModels.push(candidateModel);

    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const sanitizedConfig = sanitizeConfigForModel(candidateModel, config);
      const callPromise = activeGenerator({
        apiKey,
        model: candidateModel,
        contents,
        config: sanitizedConfig
      });

      const response =
        timeoutMs > 0
          ? await Promise.race([
              callPromise,
              new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs);
              })
            ])
          : await callPromise;

      const text =
        response?.text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        '';

      if (typeof text === 'string' && text.trim().length > 0) {
        return {
          ok: true,
          text,
          rawResponse: response,
          modelUsed: candidateModel,
          fallbackUsed: idx > 0,
          attemptedModels
        };
      }

      lastFailure = {
        category: 'transient_service',
        retryable: true,
        httpStatus: 502,
        canRetry: true,
        userMessage: 'AI evaluation returned an empty response. Please retry.'
      };
      console.warn(
        `[AI Model Policy] ${taskLabel} model=${candidateModel} returned empty response (${idx + 1}/${plan.candidates.length})`
      );
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      lastFailure = classified;
      console.warn(
        `[AI Model Policy] ${taskLabel} model=${candidateModel} category=${classified.category} retryable=${classified.retryable} (${idx + 1}/${plan.candidates.length})`
      );
      if (!classified.retryable) {
        break;
      }
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  return {
    ok: false,
    errorCategory: lastFailure.category,
    httpStatus: lastFailure.httpStatus,
    canRetry: lastFailure.canRetry,
    userMessage: lastFailure.userMessage,
    attemptedModels
  };
}
