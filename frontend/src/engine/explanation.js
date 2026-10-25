const LABELS = {
  compatibility: "color and piece harmony",
  context: "fit for the occasion",
  aesthetic: "your favorite aesthetic",
  personal: "your preferences",
  silhouette: "proportions",
  fit: "body fit",
  template: "the chosen vibe",
  novelty: "freshness",
};

const pct = (value) => `${Math.round(value * 100)}%`;

// Skips factors with no data (null), so a missing score is never shown as "0%".
export function buildExplanation(outfit, breakdown = {}) {
  const entries = Object.entries(breakdown).filter(
    ([key, value]) => LABELS[key] && typeof value === "number",
  );
  if (!entries.length) return "Built from pieces in your closet.";

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [bestKey, best] = sorted[0];
  const [worstKey, worst] = sorted[sorted.length - 1];
  if (entries.length === 1 || best - worst < 0.08)
    return `Consistent across the board, led by ${LABELS[bestKey]} (${pct(best)}).`;
  return `Strongest on ${LABELS[bestKey]} (${pct(best)}); weakest on ${LABELS[worstKey]} (${pct(worst)}).`;
}
