import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateBenchmarkRequest, validateScores } from './utils/validators.js';
import { executeGemini } from './services/geminiService.js';
import { executeMock } from './services/mockService.js';
import { evaluateResponseHeuristically, rankResults } from './services/evaluatorService.js';
import {
  getAllHistory,
  getHistoryById,
  saveBenchmarkRun,
  updateScores,
  deleteHistoryById,
  clearAllHistory
} from './data/historyStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health and provider status
app.get('/api/health', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini_api_key'));

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: 'gemini',
    configured: hasGemini,
    quotaInfo: {
      plan: 'Google AI Studio Free Tier',
      rateLimitRPM: '15 requests/min',
      dailyLimitRPD: '1,500 requests/day',
      tpm: '1,000,000 tokens/min',
      cost: '$0.00 (Free of charge)',
      billingDashboard: 'https://aistudio.google.com/app/plan_and_billing'
    }
  });
});

// Model options endpoint (Gemini only)
app.get('/api/models', (req, res) => {
  res.json({
    gemini: [
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Flagship Standard)', description: 'Full flagship multimodal model (Temp 0.7)' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Lightweight Architecture)', description: 'Ultra-fast distilled architecture for low latency' },
      { id: 'gemini-3.5-flash-creative', name: 'Gemini 3.5 Flash (Creative Profile)', description: 'Higher temperature (1.0) for creative synthesis' },
      { id: 'gemini-3.5-flash-precise', name: 'Gemini 3.5 Flash (Precise Profile)', description: 'Lower temperature (0.2) for strict factual accuracy' }
    ]
  });
});

// Execute a Gemini model configuration
async function runGeminiSlot(modelId, prompt, settings, isMock) {
  if (isMock) {
    return executeMock({ prompt, provider: 'gemini', model: modelId });
  }

  const adjustedSettings = { ...settings };
  let targetModel = modelId;

  if (modelId === 'gemini-3.5-flash-creative') {
    targetModel = 'gemini-3.5-flash';
    adjustedSettings.temperature = 1.0;
  } else if (modelId === 'gemini-3.5-flash-precise') {
    targetModel = 'gemini-3.5-flash';
    adjustedSettings.temperature = 0.2;
  }

  return executeGemini({ prompt, model: targetModel, settings: adjustedSettings });
}

// Main benchmark runner
app.post('/api/benchmark', async (req, res) => {
  const validation = validateBenchmarkRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { prompt, models, settings, isMock } = validation.data;

  const modelA = models.modelA || 'gemini-3.5-flash';
  const modelB = models.modelB || 'gemini-3.5-flash-creative';

  // Run both Gemini models concurrently
  const tasks = [
    runGeminiSlot(modelA, prompt, settings, isMock),
    runGeminiSlot(modelB, prompt, settings, isMock)
  ];

  const rawSettled = await Promise.allSettled(tasks);
  const configs = [
    { slot: 'A', model: modelA },
    { slot: 'B', model: modelB }
  ];

  const results = rawSettled.map((settled, idx) => {
    const cfg = configs[idx];
    if (settled.status === 'fulfilled') {
      const output = settled.value;
      if (output.status === 'success' && output.text) {
        const evaluation = evaluateResponseHeuristically(prompt, output.text);
        return {
          ...output,
          slot: cfg.slot,
          evaluation
        };
      } else {
        return {
          ...output,
          slot: cfg.slot,
          evaluation: null
        };
      }
    } else {
      return {
        provider: 'gemini',
        model: cfg.model,
        slot: cfg.slot,
        text: null,
        latencyMs: 0,
        usage: { promptTokens: null, completionTokens: null, totalTokens: null },
        status: 'error',
        error: settled.reason?.message || 'Execution failed.',
        evaluation: null
      };
    }
  });

  const rankedResults = rankResults(results);
  const winnerItem = rankedResults.find(r => r.isWinner);
  const winner = winnerItem
    ? { provider: winnerItem.provider, model: winnerItem.model, score: winnerItem.overallScore, slot: winnerItem.slot }
    : null;

  const runEntry = {
    prompt,
    settings,
    results: rankedResults,
    winner,
    isMock,
    timestamp: new Date().toISOString()
  };

  const saved = await saveBenchmarkRun(runEntry);

  res.json({
    benchmarkId: saved.id,
    timestamp: saved.timestamp,
    prompt: saved.prompt,
    settings: saved.settings,
    results: saved.results,
    winner: saved.winner,
    isMock: saved.isMock
  });
});

// Benchmark history endpoints
app.get('/api/history', async (req, res) => {
  try {
    const history = await getAllHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

app.get('/api/history/:id', async (req, res) => {
  try {
    const item = await getHistoryById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Benchmark run not found.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve benchmark entry' });
  }
});

app.put('/api/history/:id/scores', async (req, res) => {
  const { slot, provider, scores } = req.body;
  const validation = validateScores(scores);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const targetKey = slot || provider;
    const updated = await updateScores(req.params.id, targetKey, validation.data);
    if (!updated) return res.status(404).json({ error: 'Benchmark run or model slot not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update scores.' });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const ok = await deleteHistoryById(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Benchmark run not found.' });
    res.json({ success: true, message: 'Benchmark deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete benchmark run.' });
  }
});

app.delete('/api/history', async (req, res) => {
  try {
    await clearAllHistory();
    res.json({ success: true, message: 'All history cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history.' });
  }
});

// CSV Export
app.get('/api/export/csv/:id', async (req, res) => {
  try {
    const item = await getHistoryById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Benchmark run not found.' });

    const headers = [
      'Benchmark ID',
      'Timestamp',
      'Model Slot',
      'Model',
      'Status',
      'Rank',
      'Is Winner',
      'Overall Score (%)',
      'Accuracy (%)',
      'Relevance (%)',
      'Completeness (%)',
      'Clarity (%)',
      'Latency (ms)',
      'Prompt Tokens',
      'Completion Tokens',
      'Total Tokens',
      'Prompt'
    ];

    const rows = item.results.map(r => {
      const evalScores = r.evaluation?.scores || {};
      const usage = r.usage || {};
      return [
        `"${item.id}"`,
        `"${item.timestamp}"`,
        `"${r.slot || 'N/A'}"`,
        `"${r.model}"`,
        `"${r.status}"`,
        r.rank || 'N/A',
        r.isWinner ? 'YES' : 'NO',
        r.overallScore ?? (r.evaluation?.overallScore ?? 0),
        evalScores.accuracy ?? 0,
        evalScores.relevance ?? 0,
        evalScores.completeness ?? 0,
        evalScores.clarity ?? 0,
        r.latencyMs || 'N/A',
        usage.promptTokens ?? 'N/A',
        usage.completionTokens ?? 'N/A',
        usage.totalTokens ?? 'N/A',
        `"${item.prompt.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gemini-benchmark-${item.id}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error occurred.',
    message: err.message
  });
});

let currentPort = parseInt(process.env.PORT || '3000', 10);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Gemini Comparison System Server running at:`);
    console.log(`   👉 http://localhost:${port}`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is already in use.`);
      const nextPort = port === 3000 ? 5050 : port + 1;
      console.log(`🔄 Trying alternate port http://localhost:${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Server error:', err);
    }
  });
}

// Only listen on local port if not running in a Vercel serverless environment
if (!process.env.VERCEL) {
  startServer(currentPort);
}

export default app;
