/**
 * Input validation utilities for AI Benchmarking Suite
 */

export function validateBenchmarkRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { prompt, models, settings, isMock } = body;

  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required and must be a string.' };
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    return { valid: false, error: 'Prompt cannot be empty or only whitespace.' };
  }

  if (trimmedPrompt.length > 20000) {
    return { valid: false, error: 'Prompt exceeds maximum allowed length of 20,000 characters.' };
  }

  let validatedSettings = {
    temperature: 0.7,
    maxTokens: 1024,
    timeoutMs: 60000
  };

  if (settings && typeof settings === 'object') {
    if (typeof settings.temperature === 'number' && settings.temperature >= 0 && settings.temperature <= 2) {
      validatedSettings.temperature = settings.temperature;
    }
    if (typeof settings.maxTokens === 'number' && settings.maxTokens >= 1 && settings.maxTokens <= 8192) {
      validatedSettings.maxTokens = Math.floor(settings.maxTokens);
    }
    if (typeof settings.timeoutMs === 'number' && settings.timeoutMs >= 5000 && settings.timeoutMs <= 180000) {
      validatedSettings.timeoutMs = Math.floor(settings.timeoutMs);
    }
  }

  const validatedModels = {
    modelA: (models && typeof models.modelA === 'string' && models.modelA.trim()) || 'gemini-3.5-flash',
    modelB: (models && typeof models.modelB === 'string' && models.modelB.trim()) || 'gemini-3.1-flash-lite',
    providerA: (models && typeof models.providerA === 'string' && models.providerA.trim()) || 'gemini',
    providerB: (models && typeof models.providerB === 'string' && models.providerB.trim()) || 'gemini'
  };

  return {
    valid: true,
    data: {
      prompt: trimmedPrompt,
      models: validatedModels,
      settings: validatedSettings,
      isMock: Boolean(isMock)
    }
  };
}

export function validateScores(scores) {
  if (!scores || typeof scores !== 'object') {
    return { valid: false, error: 'Scores must be an object' };
  }

  const metrics = ['accuracy', 'relevance', 'completeness', 'clarity'];
  const sanitized = {};

  for (const metric of metrics) {
    const val = Number(scores[metric]);
    if (isNaN(val) || val < 0 || val > 100) {
      return { valid: false, error: `Metric "${metric}" must be a percentage between 0 and 100.` };
    }
    sanitized[metric] = Math.round(val * 10) / 10;
  }

  return { valid: true, data: sanitized };
}
