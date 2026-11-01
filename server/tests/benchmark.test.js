import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBenchmarkRequest, validateScores } from '../utils/validators.js';
import { calculateWeightedScore, rankResults } from '../services/evaluatorService.js';
import { executeMock } from '../services/mockService.js';
import { saveBenchmarkRun, getHistoryById, updateScores, deleteHistoryById } from '../data/historyStore.js';

test('Validator: should validate a proper benchmark request', () => {
  const result = validateBenchmarkRequest({
    prompt: 'Explain quantum computing in simple terms.',
    models: { modelA: 'gemini-3.5-flash', modelB: 'llama-3.3-70b-versatile', providerA: 'gemini', providerB: 'groq' },
    settings: { temperature: 0.5, maxTokens: 500 },
    isMock: false
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.prompt, 'Explain quantum computing in simple terms.');
  assert.equal(result.data.models.modelA, 'gemini-3.5-flash');
  assert.equal(result.data.models.modelB, 'llama-3.3-70b-versatile');
  assert.equal(result.data.settings.temperature, 0.5);
});

test('Validator: should reject empty prompt', () => {
  const result = validateBenchmarkRequest({ prompt: '   ' });
  assert.equal(result.valid, false);
  assert.match(result.error, /empty/i);
});

test('Validator: should validate percentage score bounds (0-100)', () => {
  const valid = validateScores({ accuracy: 85, relevance: 90, completeness: 80, clarity: 95 });
  assert.equal(valid.valid, true);
  assert.equal(valid.data.accuracy, 85);

  const invalid = validateScores({ accuracy: 120, relevance: 90, completeness: 80, clarity: 95 });
  assert.equal(invalid.valid, false);
  assert.match(invalid.error, /between 0 and 100/i);
});

test('Evaluator: should accurately calculate weighted score out of 100%', () => {
  // Max score: 100% in all dimensions -> 100%
  const maxScore = calculateWeightedScore({ accuracy: 100, relevance: 100, completeness: 100, clarity: 100 });
  assert.equal(maxScore, 100);

  // Min score: 0% in all dimensions -> 0%
  const minScore = calculateWeightedScore({ accuracy: 0, relevance: 0, completeness: 0, clarity: 0 });
  assert.equal(minScore, 0);

  // Mixed: Accuracy 80% (28), Relevance 90% (22.5), Completeness 70% (14), Clarity 90% (18) -> 82.5%
  const mixed = calculateWeightedScore({ accuracy: 80, relevance: 90, completeness: 70, clarity: 90 });
  assert.equal(mixed, 82.5);
});

test('Evaluator: should rank models correctly and assign winner', () => {
  const rawResults = [
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      status: 'success',
      latencyMs: 400,
      evaluation: { overallScore: 78 }
    },
    {
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      status: 'success',
      latencyMs: 500,
      evaluation: { overallScore: 88 }
    }
  ];

  const ranked = rankResults(rawResults);
  assert.equal(ranked[0].provider, 'gemini');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].isWinner, true);

  assert.equal(ranked[1].provider, 'groq');
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[1].isWinner, false);
});

test('Evaluator: should preserve partial results when one model fails', () => {
  const partialResults = [
    {
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      status: 'success',
      latencyMs: 620,
      evaluation: { overallScore: 85 }
    },
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      status: 'error',
      error: 'Invalid API Key',
      evaluation: null
    }
  ];

  const ranked = rankResults(partialResults);
  assert.equal(ranked[0].provider, 'gemini');
  assert.equal(ranked[0].isWinner, true);
  assert.equal(ranked[1].provider, 'groq');
  assert.equal(ranked[1].rank, null);
  assert.equal(ranked[1].status, 'error');
});

test('MockService: should generate simulated responses with tokens and latency', async () => {
  const res = await executeMock({
    prompt: 'Write a quicksort in JavaScript',
    provider: 'gemini',
    model: 'gemini-3.5-flash'
  });

  assert.equal(res.status, 'success');
  assert.ok(res.text.length > 50);
  assert.ok(res.latencyMs > 0);
  assert.ok(res.usage.promptTokens > 0);
  assert.ok(res.usage.completionTokens > 0);
  assert.ok(res.usage.totalTokens > 0);
  assert.equal(res.isDemo, true);
});

test('HistoryStore: should save benchmark run and allow percentage score editing', async () => {
  const testId = `test_run_${Date.now()}`;
  const mockEntry = {
    id: testId,
    prompt: 'Test prompt for benchmark',
    timestamp: new Date().toISOString(),
    results: [
      {
        provider: 'gemini',
        model: 'gemini-3.5-flash',
        slot: 'A',
        status: 'success',
        latencyMs: 500,
        evaluation: {
          scores: { accuracy: 80, relevance: 80, completeness: 80, clarity: 80 },
          overallScore: 80
        }
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        slot: 'B',
        status: 'success',
        latencyMs: 400,
        evaluation: {
          scores: { accuracy: 70, relevance: 70, completeness: 70, clarity: 70 },
          overallScore: 70
        }
      }
    ]
  };

  await saveBenchmarkRun(mockEntry);
  const fetched = await getHistoryById(testId);
  assert.ok(fetched);
  assert.equal(fetched.prompt, 'Test prompt for benchmark');

  // Update Slot B scores manually to 95% across the board
  const updated = await updateScores(testId, 'B', {
    accuracy: 95,
    relevance: 95,
    completeness: 95,
    clarity: 95
  });

  assert.ok(updated);
  const slotBResult = updated.results.find(r => r.slot === 'B');
  assert.equal(slotBResult.overallScore, 95);
  assert.equal(slotBResult.isWinner, true);
  assert.equal(slotBResult.evaluation.evaluationType, 'manual_override');

  await deleteHistoryById(testId);
});
