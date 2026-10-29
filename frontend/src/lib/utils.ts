import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateString(str: string, frontLen = 6, backLen = 4): string {
  if (!str) return '';
  if (str.length <= frontLen + backLen) return str;
  return `${str.slice(0, frontLen)}...${str.slice(-backLen)}`;
}

export function shortAddress(value: string): string {
  return truncateString(value, 8, 6);
}

export function formatDate(timestamp: string | number): string {
  if (!timestamp) return 'N/A';
  const d = new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp);
  return isNaN(d.getTime()) ? String(timestamp) : d.toLocaleString();
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return Promise.resolve(true);
    } catch {
      textArea.remove();
      return Promise.resolve(false);
    }
  }
}
