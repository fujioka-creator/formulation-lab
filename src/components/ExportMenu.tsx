"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onExportWord: () => void;
  onExportExcel: () => void;
  onExportText: () => void;
}

export function ExportMenu({ onExportWord, onExportExcel, onExportText }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
        title="エクスポート"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-50">
          <button
            onClick={() => {
              onExportWord();
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="w-5 text-center text-blue-600 font-bold text-xs">
              W
            </span>
            Word (.docx)
          </button>
          <button
            onClick={() => {
              onExportExcel();
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="w-5 text-center text-emerald-600 font-bold text-xs">
              X
            </span>
            Excel (.xlsx)
          </button>
          <button
            onClick={() => {
              onExportText();
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="w-5 text-center text-stone-500 font-bold text-xs">
              T
            </span>
            テキスト (.txt)
          </button>
        </div>
      )}
    </div>
  );
}
