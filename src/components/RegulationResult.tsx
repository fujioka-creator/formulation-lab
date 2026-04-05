"use client";

import { useState } from "react";

interface RegulationData {
  source?: string;
  country?: string;
  itemType?: string;
  hasFormulation?: boolean;
  findings?: string;
  error?: string;
}

export function RegulationResult({ data }: { data: RegulationData }) {
  const [open, setOpen] = useState(true);

  if (data.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700 font-medium">規制チェックエラー</p>
        <p className="text-xs text-red-600 mt-1">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-violet-50 border-b border-violet-200 flex items-center justify-between hover:bg-violet-100/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-violet-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-sm font-semibold text-violet-800">
            規制チェック: {data.country} / {data.itemType}
          </span>
          {data.hasFormulation && (
            <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full">
              処方チェック含む
            </span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-violet-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2">
          {data.findings && (
            <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
              {data.findings}
            </div>
          )}
          {data.source && (
            <p className="text-[10px] text-stone-400 pt-1 border-t border-stone-100">
              {data.source}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
