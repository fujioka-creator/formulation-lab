"use client";

import type { ChatSession } from "@/lib/history";

interface Props {
  sessions: ChatSession[];
  currentId: string | null;
  onSelect: (session: ChatSession) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}

export function HistorySidebar({
  sessions,
  currentId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Sidebar */}
      <div className="relative w-72 bg-white h-full shadow-xl flex flex-col">
        <div className="px-4 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-800">処方相談履歴</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-100 text-stone-500"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-3 py-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新しい処方相談
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {sessions.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-8">
              履歴がありません
            </p>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    session.id === currentId
                      ? "bg-stone-100 border border-stone-300"
                      : "hover:bg-stone-50"
                  }`}
                  onClick={() => onSelect(session)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800 truncate">
                      {session.title}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {new Date(session.updatedAt).toLocaleDateString("ja-JP")}{" "}
                      {session.provider === "claude" ? "Claude" : "Gemini"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200 text-stone-400 transition-opacity"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
