import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateWeightedScore, rankResults } from '../services/evaluatorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.join(__dirname, 'history.json');

let inMemoryHistory = [];
let isLoaded = false;

async function loadHistory() {
  if (isLoaded) return inMemoryHistory;
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf-8');
    inMemoryHistory = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Could not read history.json:', err.message);
    }
    inMemoryHistory = [];
  }
  isLoaded = true;
  return inMemoryHistory;
}

async function persistHistory() {
  try {
    await fs.mkdir(__dirname, { recursive: true });
    await fs.writeFile(HISTORY_FILE, JSON.stringify(inMemoryHistory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist history:', err.message);
  }
}

export async function getAllHistory() {
  await loadHistory();
  return [...inMemoryHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function getHistoryById(id) {
  await loadHistory();
  return inMemoryHistory.find(item => item.id === id) || null;
}

export async function saveBenchmarkRun(runData) {
  await loadHistory();

  const entry = {
    id: runData.id || `bench_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: runData.timestamp || new Date().toISOString(),
    prompt: runData.prompt,
    settings: runData.settings,
    results: runData.results,
    winner: runData.winner || null,
    isMock: Boolean(runData.isMock)
  };

  inMemoryHistory.unshift(entry);
  // Cap at 100 historical benchmarks to prevent unbounded file growth
  if (inMemoryHistory.length > 100) {
    inMemoryHistory = inMemoryHistory.slice(0, 100);
  }

  await persistHistory();
  return entry;
}

export async function updateScores(id, targetKey, updatedScores) {
  await loadHistory();
  const entry = inMemoryHistory.find(item => item.id === id);
  if (!entry) return null;

  const targetResult = entry.results.find(r => r.slot === targetKey || r.provider === targetKey);
  if (!targetResult) return null;

  // Calculate new weighted score
  const newOverall = calculateWeightedScore(updatedScores);
  targetResult.evaluation = {
    ...targetResult.evaluation,
    scores: updatedScores,
    overallScore: newOverall,
    evaluationType: 'manual_override',
    editedAt: new Date().toISOString(),
    disclaimer: 'User manually verified or edited these scores.'
  };

  // Re-rank results
  entry.results = rankResults(entry.results);
  const winnerItem = entry.results.find(r => r.isWinner);
  entry.winner = winnerItem ? { provider: winnerItem.provider, model: winnerItem.model, score: winnerItem.overallScore } : null;

  await persistHistory();
  return entry;
}

export async function deleteHistoryById(id) {
  await loadHistory();
  const initialLength = inMemoryHistory.length;
  inMemoryHistory = inMemoryHistory.filter(item => item.id !== id);
  if (inMemoryHistory.length !== initialLength) {
    await persistHistory();
    return true;
  }
  return false;
}

export async function clearAllHistory() {
  inMemoryHistory = [];
  await persistHistory();
  return true;
}

