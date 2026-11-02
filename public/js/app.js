/**
 * Gemini Comparison Suite - Client Logic
 */

const state = {
  currentBenchmark: null,
  isMock: false,
  weights: {
    accuracy: 0.35,
    relevance: 0.25,
    completeness: 0.20,
    clarity: 0.20
  }
};

const elements = {
  promptInput: document.getElementById('prompt-input'),
  promptCharCount: document.getElementById('prompt-char-count'),
  runBtn: document.getElementById('run-benchmark-btn'),
  selectModelA: document.getElementById('select-model-a'),
  selectModelB: document.getElementById('select-model-b'),
  modeLiveBtn: document.getElementById('mode-live-btn'),
  modeDemoBtn: document.getElementById('mode-demo-btn'),
  openHistoryBtn: document.getElementById('open-history-btn'),
  closeHistoryBtn: document.getElementById('close-history-btn'),
  historyDrawer: document.getElementById('history-drawer'),
  historyBackdrop: document.getElementById('history-backdrop'),
  historyListContainer: document.getElementById('history-list-container'),
  historyBadge: document.getElementById('history-badge'),
  historyCountLabel: document.getElementById('history-count-label'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

const METRIC_KEY_MAP = {
  accuracy: 'acc',
  relevance: 'rel',
  completeness: 'comp',
  clarity: 'clar'
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  setupEventListeners();
  resetAllFactorsToZero();
  fetchHistory();
});

// Reset all factor scores to 0% by default
function resetAllFactorsToZero() {
  ['a', 'b'].forEach(slot => {
    const overallEl = document.getElementById(`card-${slot}-overall-score`);
    if (overallEl) overallEl.textContent = '0%';

    ['accuracy', 'relevance', 'completeness', 'clarity'].forEach(m => {
      const key = METRIC_KEY_MAP[m];
      const valEl = document.getElementById(`card-${slot}-${key}-val`);
      if (valEl) valEl.textContent = '0%';

      const bar = document.getElementById(`card-${slot}-${key}-bar`);
      if (bar) bar.style.width = '0%';
    });
  });
}

function setupEventListeners() {
  elements.promptInput.addEventListener('input', (e) => {
    elements.promptCharCount.textContent = `${e.target.value.length} characters`;
  });
  elements.promptCharCount.textContent = `${elements.promptInput.value.length} characters`;

  // Sample prompt chips
  document.querySelectorAll('.template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      elements.promptInput.value = chip.dataset.prompt;
      elements.promptCharCount.textContent = `${elements.promptInput.value.length} characters`;
      showToast('Template prompt loaded');
    });
  });

  // Mode toggles
  elements.modeLiveBtn.addEventListener('click', () => setDemoMode(false));
  elements.modeDemoBtn.addEventListener('click', () => setDemoMode(true));

  // Run benchmark
  elements.runBtn.addEventListener('click', handleRunBenchmark);

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const text = targetEl.innerText || targetEl.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('Response copied to clipboard!');
        });
      }
    });
  });

  // History Drawer
  elements.openHistoryBtn.addEventListener('click', openHistory);
  elements.closeHistoryBtn.addEventListener('click', closeHistory);
  elements.historyBackdrop.addEventListener('click', closeHistory);
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
}

function setDemoMode(isDemo) {
  state.isMock = isDemo;
  if (isDemo) {
    elements.modeDemoBtn.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition bg-indigo-600 text-white shadow-sm';
    elements.modeLiveBtn.className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
    showToast('Demo Mode enabled');
  } else {
    elements.modeLiveBtn.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition bg-indigo-600 text-white shadow-sm';
    elements.modeDemoBtn.className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
    showToast('Live Gemini API enabled');
  }
}

// Main Benchmark Runner
async function handleRunBenchmark() {
  const prompt = elements.promptInput.value.trim();
  if (!prompt) {
    showToast('Please enter a prompt.');
    elements.promptInput.focus();
    return;
  }

  setLoadingState(true);

  const modelA = elements.selectModelA.value;
  const modelB = elements.selectModelB.value;

  document.getElementById('card-a-title').textContent = 'Google Gemini';
  document.getElementById('card-a-model-tag').textContent = modelA;
  document.getElementById('card-b-title').textContent = 'Google Gemini';
  document.getElementById('card-b-model-tag').textContent = modelB;

  const payload = {
    prompt,
    models: {
      modelA,
      modelB
    },
    settings: {
      temperature: 0.7,
      maxTokens: 8192, // Generous limit so thinking tokens don't cut off full response
      timeoutMs: 60000
    },
    isMock: state.isMock
  };

  try {
    const response = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Comparison execution failed.');
    }

    state.currentBenchmark = data;
    renderBenchmarkResults(data);
    fetchHistory();
    showToast('Comparison completed!');
  } catch (err) {
    showToast(`Error: ${err.message}`);
    console.error('Benchmark error:', err);
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  elements.runBtn.disabled = isLoading;
  elements.runBtn.classList.toggle('opacity-75', isLoading);

  const btnSpan = elements.runBtn.querySelector('span');
  if (btnSpan) btnSpan.textContent = isLoading ? 'Comparing...' : 'Compare';

  ['a', 'b'].forEach(slot => {
    const loader = document.getElementById(`card-${slot}-loading`);
    const textEl = document.getElementById(`card-${slot}-text`);
    const statusBadge = document.getElementById(`card-${slot}-status-badge`);
    const errorEl = document.getElementById(`card-${slot}-error`);

    if (isLoading) {
      if (loader) loader.classList.remove('hidden');
      if (textEl) textEl.classList.add('hidden');
      if (errorEl) errorEl.classList.add('hidden');
      if (statusBadge) {
        statusBadge.textContent = 'Generating...';
        statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse';
      }
    } else {
      if (loader) loader.classList.add('hidden');
      if (textEl) textEl.classList.remove('hidden');
    }
  });
}

function renderBenchmarkResults(data) {
  if (!data || !data.results) return;

  const results = data.results;

  results.forEach((res, idx) => {
    const slot = (res.slot || (idx === 0 ? 'A' : 'B')).toLowerCase();
    const card = document.getElementById(`card-${slot}`);
    const statusBadge = document.getElementById(`card-${slot}-status-badge`);
    const rankBadge = document.getElementById(`card-${slot}-rank-badge`);
    const latencyEl = document.getElementById(`card-${slot}-latency`);
    const tokensEl = document.getElementById(`card-${slot}-tokens`);
    const textEl = document.getElementById(`card-${slot}-text`);
    const errorEl = document.getElementById(`card-${slot}-error`);
    const overallScoreEl = document.getElementById(`card-${slot}-overall-score`);

    if (card) card.classList.toggle('winner-card', Boolean(res.isWinner));

    if (res.status === 'success') {
      if (statusBadge) {
        statusBadge.textContent = 'Success';
        statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      }

      if (rankBadge && res.rank) {
        rankBadge.classList.remove('hidden');
        if (res.rank === 1) {
          rankBadge.textContent = '#1 Winner';
          rankBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 shadow-xs';
        } else {
          rankBadge.textContent = '#2 Place';
          rankBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700';
        }
      }

      if (latencyEl) {
        latencyEl.textContent = `${res.latencyMs}ms`;
        latencyEl.className = `font-mono font-medium ${res.latencyMs < 1500 ? 'text-emerald-600' : 'text-slate-700'}`;
      }

      if (tokensEl) {
        if (res.usage && res.usage.totalTokens !== null) {
          tokensEl.textContent = `${res.usage.totalTokens} tokens (p: ${res.usage.promptTokens ?? '-'}, c: ${res.usage.completionTokens ?? '-'})`;
        } else {
          tokensEl.textContent = 'N/A';
        }
      }

      if (textEl) {
        textEl.innerHTML = window.marked ? window.marked.parse(res.text || '') : (res.text || '');
      }
      if (errorEl) errorEl.classList.add('hidden');

      // Update Factor Scores & Sliders to Percentages!
      if (res.evaluation) {
        const scores = res.evaluation.scores;
        setPercentageFactor(slot, 'accuracy', scores.accuracy);
        setPercentageFactor(slot, 'relevance', scores.relevance);
        setPercentageFactor(slot, 'completeness', scores.completeness);
        setPercentageFactor(slot, 'clarity', scores.clarity);

        if (overallScoreEl) {
          overallScoreEl.textContent = `${Math.round(res.overallScore ?? res.evaluation.overallScore)}%`;
        }
      }
    } else {
      // Error state for this model slot
      if (statusBadge) {
        statusBadge.textContent = 'Failed';
        statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200';
      }
      if (rankBadge) rankBadge.classList.add('hidden');
      if (latencyEl) latencyEl.textContent = `${res.latencyMs || 0}ms`;
      if (tokensEl) tokensEl.textContent = 'N/A';
      if (textEl) textEl.innerHTML = '';
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.innerHTML = `<strong>Error:</strong> ${escapeHtml(res.error || 'Execution failed.')}`;
      }
      if (overallScoreEl) overallScoreEl.textContent = '0%';

      ['accuracy', 'relevance', 'completeness', 'clarity'].forEach(m => {
        setPercentageFactor(slot, m, 0);
      });
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

function setPercentageFactor(slot, metric, value) {
  const rounded = Math.round(Number(value) || 0);
  const key = METRIC_KEY_MAP[metric] || metric;
  const label = document.getElementById(`card-${slot}-${key}-val`);
  if (label) label.textContent = `${rounded}%`;

  const bar = document.getElementById(`card-${slot}-${key}-bar`);
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, rounded))}%`;
}

// Live Recalculate Overall Score when user moves slider
function recalculateSlotOverallScore(slot) {
  const getVal = (m) => {
    const s = document.querySelector(`.score-slider[data-slot="${slot.toUpperCase()}"][data-metric="${m}"]`);
    return s ? parseInt(s.value, 10) : 0;
  };

  const scores = {
    accuracy: getVal('accuracy'),
    relevance: getVal('relevance'),
    completeness: getVal('completeness'),
    clarity: getVal('clarity')
  };

  const weighted = (scores.accuracy * state.weights.accuracy) +
                   (scores.relevance * state.weights.relevance) +
                   (scores.completeness * state.weights.completeness) +
                   (scores.clarity * state.weights.clarity);

  const overall = Math.min(100, Math.max(0, Math.round(weighted)));

  const scoreEl = document.getElementById(`card-${slot}-overall-score`);
  if (scoreEl) scoreEl.textContent = `${overall}%`;

  if (state.currentBenchmark && state.currentBenchmark.results) {
    const item = state.currentBenchmark.results.find(r => (r.slot || '').toLowerCase() === slot);
    if (item) {
      if (!item.evaluation) item.evaluation = { scores: {} };
      item.evaluation.scores = scores;
      item.overallScore = overall;
      item.evaluation.overallScore = overall;

      recomputeRanksAndWinner();
    }
  }
}

function recomputeRanksAndWinner() {
  if (!state.currentBenchmark || !state.currentBenchmark.results) return;

  const valid = state.currentBenchmark.results.filter(r => r.status === 'success');
  valid.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  valid.forEach((r, idx) => {
    r.rank = idx + 1;
    r.isWinner = idx === 0 && r.overallScore > 0;

    const slot = (r.slot || (idx === 0 ? 'A' : 'B')).toLowerCase();
    const rankBadge = document.getElementById(`card-${slot}-rank-badge`);
    const card = document.getElementById(`card-${slot}`);

    if (card) card.classList.toggle('winner-card', r.isWinner);

    if (rankBadge) {
      if (r.rank === 1) {
        rankBadge.textContent = '#1 Winner';
        rankBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 shadow-xs';
        rankBadge.classList.remove('hidden');
      } else {
        rankBadge.textContent = '#2 Place';
        rankBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700';
        rankBadge.classList.remove('hidden');
      }
    }
  });
}

// Fetch Benchmark History List
async function fetchHistory() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    elements.historyBadge.textContent = data.length;
    elements.historyCountLabel.textContent = `${data.length} records`;
    renderHistoryList(data);
  } catch (err) {
    console.warn('Could not load history:', err);
  }
}

function renderHistoryList(items) {
  if (!items || items.length === 0) {
    elements.historyListContainer.innerHTML = '<p class="text-xs text-slate-400 italic">No past benchmark runs recorded yet.</p>';
    return;
  }

  elements.historyListContainer.innerHTML = items.map(item => {
    const dateStr = new Date(item.timestamp).toLocaleTimeString();
    const promptSnippet = item.prompt.length > 55 ? `${item.prompt.slice(0, 55)}...` : item.prompt;
    const winnerBadge = item.winner
      ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Winner (${item.winner.score}%)</span>`
      : `<span class="text-[10px] text-slate-400">Incomplete</span>`;

    return `
      <div class="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition flex flex-col gap-1.5" onclick="loadHistoricalBenchmark('${item.id}')">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-500 font-mono">${dateStr}</span>
          ${winnerBadge}
        </div>
        <p class="text-xs text-slate-800 font-medium line-clamp-2">"${escapeHtml(promptSnippet)}"</p>
        <div class="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-200">
          <span>${item.isMock ? 'Demo Mode' : 'Live API'}</span>
          <span class="text-indigo-600 font-semibold hover:underline">Load &rarr;</span>
        </div>
      </div>
    `;
  }).join('');
}

window.loadHistoricalBenchmark = async function(id) {
  try {
    const res = await fetch(`/api/history/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    state.currentBenchmark = data;
    elements.promptInput.value = data.prompt;
    elements.promptCharCount.textContent = `${data.prompt.length} characters`;

    renderBenchmarkResults(data);
    closeHistory();
    showToast('Loaded benchmark run from history.');
  } catch (err) {
    showToast(`Error loading run: ${err.message}`);
  }
};

async function handleClearHistory() {
  if (!confirm('Clear all benchmark history?')) return;
  try {
    const res = await fetch('/api/history', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear');
    elements.historyBadge.textContent = '0';
    elements.historyCountLabel.textContent = '0 records';
    renderHistoryList([]);
    showToast('History cleared.');
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

function openHistory() {
  elements.historyDrawer.classList.remove('translate-x-full');
  elements.historyBackdrop.classList.remove('hidden');
}

function closeHistory() {
  elements.historyDrawer.classList.add('translate-x-full');
  elements.historyBackdrop.classList.add('hidden');
}

let toastTimeout;
function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove('translate-y-16', 'opacity-0');
  elements.toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('translate-y-0', 'opacity-100');
    elements.toast.classList.add('translate-y-16', 'opacity-0');
  }, 3500);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
