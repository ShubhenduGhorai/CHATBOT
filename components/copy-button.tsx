'use client';

import { useState } from 'react';

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100'
      }
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
