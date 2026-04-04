import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names using clsx + tailwind-merge.
 * Single source of truth — import from here everywhere.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
