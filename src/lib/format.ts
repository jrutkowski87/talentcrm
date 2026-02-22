/**
 * Shared formatting utilities used across the application.
 */

/** Convert snake_case to Title Case (e.g. 'creative_brief' → 'Creative Brief') */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Format a number as USD currency (e.g. 50000 → '$50,000') */
export function formatCurrency(amount: number | null, currency = 'USD'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Relative time string (e.g. '2 hours ago', '3 days ago') */
export function relativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
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
