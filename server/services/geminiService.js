/**
 * Service to execute prompts against Google Gemini API
 */
export async function executeGemini({ prompt, model = 'gemini-3.5-flash', settings = {} }) {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

  if (!apiKey || apiKey.includes('your_gemini_api_key_here')) {
    return {
      provider: 'gemini',
      model,
      text: null,
      latencyMs: 0,
      usage: { promptTokens: null, completionTokens: null, totalTokens: null },
      status: 'error',
      error: 'GEMINI_API_KEY is not configured on the server. Please set it in .env.'
    };
  }

  // Modern Gemini models mapping
  let targetModel = model;
  if (model.includes('1.5') || model.includes('2.0') || model.includes('2.5')) {
    targetModel = 'gemini-3.5-flash';
  }

  const timeoutMs = settings.timeoutMs || 60000;
  // Use generous token limit (8192) so thinking tokens don't cut off the actual output text
  const maxOutputTokens = settings.maxTokens && settings.maxTokens > 1024 ? settings.maxTokens : 8192;
  const startTime = performance.now();

  async function callGemini(modelName, temperature = 0.7) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  }

  try {
    let response = await callGemini(targetModel, settings.temperature ?? 0.7);

    // If 503 high demand or 429 rate limit, retry or fall back to gemini-3.5-flash
    if ((response.status === 503 || response.status === 429) && targetModel !== 'gemini-3.5-flash') {
      console.warn(`Model ${targetModel} returned ${response.status}. Falling back to stable gemini-3.5-flash...`);
      await new Promise(r => setTimeout(r, 800));
      targetModel = 'gemini-3.5-flash';
      response = await callGemini('gemini-3.5-flash', 0.8);
    } else if (response.status === 503) {
      await new Promise(r => setTimeout(r, 1200));
      response = await callGemini(targetModel, 0.6);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text();
      let safeError = `Gemini HTTP ${response.status}: ${response.statusText}`;
      try {
        const errJson = JSON.parse(errorText);
        if (errJson.error?.message) {
          safeError = `Gemini: ${errJson.error.message}`;
        }
      } catch (_) {
        if (errorText) safeError = `Gemini: ${errorText}`;
      }

      if (apiKey && safeError.includes(apiKey)) {
        safeError = safeError.replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
      }

      return {
        provider: 'gemini',
        model: targetModel,
        text: null,
        latencyMs,
        usage: { promptTokens: null, completionTokens: null, totalTokens: null },
        status: 'error',
        error: safeError
      };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
    const usage = data.usageMetadata || {};

    return {
      provider: 'gemini',
      model: targetModel,
      text,
      latencyMs,
      finishReason: candidate?.finishReason || null,
      usage: {
        promptTokens: usage.promptTokenCount ?? null,
        completionTokens: usage.candidatesTokenCount ?? null,
        totalTokens: usage.totalTokenCount ?? null
      },
      status: 'success',
      error: null
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    let message = err.message || 'Google Gemini API request failed.';
    if (err.cause?.message) {
      message = `${message} (${err.cause.message})`;
    }

    if (err.name === 'AbortError') {
      message = `Gemini request timed out after ${timeoutMs}ms.`;
    }

    if (apiKey && message.includes(apiKey)) {
      message = message.replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
    }

    return {
      provider: 'gemini',
      model: targetModel,
      text: null,
      latencyMs,
      usage: { promptTokens: null, completionTokens: null, totalTokens: null },
      status: 'error',
      error: message
    };
  }
}
