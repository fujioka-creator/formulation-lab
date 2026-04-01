const STORAGE_KEY = "formulation-lab-history";

export interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: SavedMessage[];
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export function loadHistory(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  const history = loadHistory();
  const idx = history.findIndex((h) => h.id === session.id);
  if (idx >= 0) {
    history[idx] = session;
  } else {
    history.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function deleteSession(id: string): void {
  const history = loadHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function extractTitle(messages: SavedMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "新しい処方相談";
  const textPart = firstUser.parts.find((p) => p.type === "text");
  const text = (textPart?.text as string) || "新しい処方相談";
  return text.length > 40 ? text.slice(0, 40) + "..." : text;
}
