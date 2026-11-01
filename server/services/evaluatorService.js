/**
 * Evaluator Service for scoring model responses in Percentages (0% - 100%)
 */

export const DEFAULT_WEIGHTS = {
  accuracy: 0.35,
  relevance: 0.25,
  completeness: 0.20,
  clarity: 0.20
};

/**
 * Normalizes score to 0 - 100 percentage
 */
export function normalizePercentage(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  // If legacy 1-5 scale was passed, convert to 0-100%
  if (num > 0 && num <= 5) {
    return Math.round((num / 5) * 100 * 10) / 10;
  }
  return Math.min(100, Math.max(0, Math.round(num * 10) / 10));
}

/**
 * Calculates weighted score out of 100%
 * @param {Object} scores { accuracy, relevance, completeness, clarity } in %
 * @param {Object} weights custom weights summing to 1.0
 */
export function calculateWeightedScore(scores, weights = DEFAULT_WEIGHTS) {
  if (!scores) return 0;
  const acc = normalizePercentage(scores.accuracy);
  const rel = normalizePercentage(scores.relevance);
  const comp = normalizePercentage(scores.completeness);
  const clar = normalizePercentage(scores.clarity);

  const wAcc = weights.accuracy ?? DEFAULT_WEIGHTS.accuracy;
  const wRel = weights.relevance ?? DEFAULT_WEIGHTS.relevance;
  const wComp = weights.completeness ?? DEFAULT_WEIGHTS.completeness;
  const wClar = weights.clarity ?? DEFAULT_WEIGHTS.clarity;

  const weightedSum = (acc * wAcc) + (rel * wRel) + (comp * wComp) + (clar * wClar);
  return Math.min(100, Math.max(0, Math.round(weightedSum * 10) / 10));
}

/**
 * Automated heuristic percentage evaluator
 */
export function evaluateResponseHeuristically(prompt, responseText) {
  if (!responseText || responseText.trim().length === 0) {
    return {
      scores: { accuracy: 0, relevance: 0, completeness: 0, clarity: 0 },
      overallScore: 0,
      feedback: 'No response content generated.',
      evaluationType: 'automated_heuristic'
    };
  }

  const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const textLower = responseText.toLowerCase();

  // Relevance percentage (based on keyword match ratio and prompt coherence)
  let matchedWords = 0;
  for (const word of promptWords) {
    if (textLower.includes(word)) matchedWords++;
  }
  const matchRatio = promptWords.length > 0 ? (matchedWords / promptWords.length) : 0.8;
  const relevancePct = Math.min(100, Math.max(40, Math.round((50 + (matchRatio * 50)) * 10) / 10));

  // Completeness percentage (depth, coverage of key points)
  const charLength = responseText.length;
  let completenessPct = 65;
  if (charLength > 1200) completenessPct = 96;
  else if (charLength > 700) completenessPct = 88;
  else if (charLength > 350) completenessPct = 78;
  else if (charLength < 120) completenessPct = 45;

  // Clarity percentage (formatting, headings, bullet points, clean sentences)
  let clarityPct = 68;
  const hasMarkdown = /#{1,4}\s|[-*]\s|\d+\.\s/.test(responseText);
  const hasCodeBlocks = /```[\s\S]*?```/.test(responseText);
  const hasParagraphs = responseText.split('\n\n').length >= 2;

  if (hasMarkdown) clarityPct += 15;
  if (hasCodeBlocks) clarityPct += 8;
  if (hasParagraphs) clarityPct += 9;
  clarityPct = Math.min(100, Math.max(40, clarityPct));

  // Accuracy percentage (semantic coherence & prompt alignment)
  let accuracyPct = Math.min(100, Math.max(50, Math.round(((relevancePct * 0.55) + (clarityPct * 0.45)) * 10) / 10));

  const scores = {
    accuracy: accuracyPct,
    relevance: relevancePct,
    completeness: completenessPct,
    clarity: clarityPct
  };

  const overallScore = calculateWeightedScore(scores);

  return {
    scores,
    overallScore,
    feedback: `Automated assessment: ${charLength} characters, structured formatting, prompt relevance.`,
    evaluationType: 'automated_heuristic',
    isFactChecked: false,
    disclaimer: 'Automated AI evaluations are model-estimated percentages and not verified human ground truth.'
  };
}

/**
 * Rank multiple model results
 */
export function rankResults(results) {
  const ranked = results.map(item => {
    const overall = (item.status === 'success' && item.evaluation) ? item.evaluation.overallScore : 0;
    return { ...item, overallScore: overall };
  });

  ranked.sort((a, b) => {
    if (a.status !== 'success' && b.status === 'success') return 1;
    if (a.status === 'success' && b.status !== 'success') return -1;
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    return (a.latencyMs || 999999) - (b.latencyMs || 999999);
  });

  return ranked.map((item, index) => ({
    ...item,
    rank: item.status === 'success' ? (index + 1) : null,
    isWinner: item.status === 'success' && index === 0 && item.overallScore > 0
  }));
}
