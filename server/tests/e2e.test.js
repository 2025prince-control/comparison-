import test from 'node:test';
import assert from 'node:assert/strict';
import { executeMock } from '../services/mockService.js';
import { saveBenchmarkRun, getHistoryById, updateScores, getAllHistory } from '../data/historyStore.js';
import { evaluateResponseHeuristically, rankResults } from '../services/evaluatorService.js';

test('Integration: Dual-model benchmark execution workflow in memory', async () => {
  const prompt = 'Compare React and Vue state management options';
  const models = { modelA: 'gemini-3.5-flash', modelB: 'llama-3.3-70b-versatile' };
  const settings = { temperature: 0.7, maxTokens: 512, timeoutMs: 15000 };

  // 1. Run both models in parallel
  const tasks = [
    executeMock({ prompt, provider: 'gemini', model: models.modelA }),
    executeMock({ prompt, provider: 'groq', model: models.modelB })
  ];

  const outputs = await Promise.all(tasks);
  assert.equal(outputs.length, 2);

  // 2. Evaluate both outputs
  const evaluated = outputs.map((out, idx) => {
    assert.equal(out.status, 'success');
    assert.ok(out.latencyMs > 0);
    assert.ok(out.usage.totalTokens > 0);

    const evalResult = evaluateResponseHeuristically(prompt, out.text);
    return {
      ...out,
      slot: idx === 0 ? 'A' : 'B',
      evaluation: evalResult
    };
  });

  // 3. Rank results and pick winner
  const ranked = rankResults(evaluated);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].isWinner, true);
  assert.equal(ranked[1].rank, 2);

  // 4. Save to history store
  const runData = {
    prompt,
    settings,
    results: ranked,
    winner: { provider: ranked[0].provider, model: ranked[0].model, score: ranked[0].overallScore, slot: ranked[0].slot },
    isMock: true
  };

  const saved = await saveBenchmarkRun(runData);
  assert.ok(saved.id);

  // 5. Retrieve from history
  const retrieved = await getHistoryById(saved.id);
  assert.ok(retrieved);
  assert.equal(retrieved.prompt, prompt);
  assert.equal(retrieved.results.length, 2);

  // 6. Test Manual User Score Edit (percentage scale)
  const edited = await updateScores(saved.id, 'B', {
    accuracy: 99,
    relevance: 99,
    completeness: 99,
    clarity: 99
  });

  assert.ok(edited);
  const slotBEntry = edited.results.find(r => r.slot === 'B');
  assert.equal(slotBEntry.overallScore, 99);
  assert.equal(slotBEntry.isWinner, true);
  assert.equal(slotBEntry.evaluation.evaluationType, 'manual_override');

  // 7. Verify all history listing
  const all = await getAllHistory();
  assert.ok(all.length >= 1);
  assert.ok(all.some(item => item.id === saved.id));
});
