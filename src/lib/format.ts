/**
 * Shared formatting utilities used across the application.
 */

/** Convert snake_case to Title Case (e.g. 'creative_brief' → 'Creative Brief') */
export function snakeToTitle(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Format a number as USD currency (e.g. 50000 → '$50,000') */
export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Normalise a date string for reliable parsing.
 * SQLite CURRENT_TIMESTAMP produces 'YYYY-MM-DD HH:MM:SS' (UTC, no indicator).
 * Appending 'Z' tells the JS Date parser it's UTC.
 */
function normaliseDateString(dateString: string): string {
  // Already has timezone info → use as-is
  if (/[Z+\-]\d{0,4}$/.test(dateString)) return dateString;
  // SQLite format (space-separated, no T) → append Z
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dateString)) return dateString + 'Z';
  return dateString;
}

/** Relative time string (e.g. '2 hours ago', '3 days ago') */
export function relativeTime(dateString: string): string {
  const parsed = new Date(normaliseDateString(dateString)).getTime();
  if (isNaN(parsed)) return '\u2014';
  const diffMs = Date.now() - parsed;
  if (diffMs < 0) return 'upcoming';
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months} month${months !== 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (mins > 0) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  return 'just now';
}
