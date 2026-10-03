/**
 * Formatting utilities for Astha
 */

/**
 * Format number to Bangladeshi Taka (BDT) currency (e.g. ৳18,500)
 */
export function formatBDT(amount: number): string {
  if (isNaN(amount)) return '৳0';
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Format score (0.0 to 1.0) into percentage string (e.g. "85%")
 */
export function formatPercentage(ratio: number): string {
  if (isNaN(ratio)) return '0%';
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Mask customer phone number for security / privacy (e.g. "01711-***822")
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) return phone || '***';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 5)}-***${clean.slice(8)}`;
  }
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

/**
 * Format relative time (e.g. "2 mins ago", "1 hour ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateString;
  }
}
