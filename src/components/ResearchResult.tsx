"use client";

import { useState } from "react";

interface ResearchData {
  source?: string;
  query?: string;
  findings?: string;
  error?: string;
}

export function ResearchResult({ data }: { data: ResearchData }) {
  const [open, setOpen] = useState(true);

  if (data.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700 font-medium">Gemini調査エラー</p>
        <p className="text-xs text-red-600 mt-1">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between hover:bg-blue-100/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-600"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm font-semibold text-blue-800">
            Gemini AI 調査レポート
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-blue-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2">
          {data.query && (
            <p className="text-xs text-blue-600 font-medium">
              調査: {data.query}
            </p>
          )}
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
