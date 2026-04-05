"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { SafetyResult } from "@/components/SafetyResult";
import { ResearchResult } from "@/components/ResearchResult";
import { RegulationResult } from "@/components/RegulationResult";
import { HistorySidebar } from "@/components/HistorySidebar";
import { ExportMenu } from "@/components/ExportMenu";
import {
  loadHistory,
  saveSession,
  deleteSession,
  generateId,
  extractTitle,
  type ChatSession,
  type SavedMessage,
} from "@/lib/history";
import { exportToWord, exportToExcel, exportToCSV } from "@/lib/export";

const SUGGESTIONS = [
  "敏感肌向けの保湿化粧水のベース処方を設計してください",
  "セラミド配合のクリームの処方を考えたい",
  "既存処方の防腐系を見直したい",
  "エイジングケア美容液の機能性成分を相談したい",
];

type Provider = "gemini" | "claude";

export default function Home() {
  const [provider, setProvider] = useState<Provider>("gemini");
  const providerRef = useRef<Provider>("gemini");
  const [sessionId, setSessionId] = useState<string>(() => generateId());
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Keep ref in sync
  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ provider: providerRef.current }),
      }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: sessionId,
    transport,
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-save when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    const session: ChatSession = {
      id: sessionId,
      title: extractTitle(messages as unknown as SavedMessage[]),
      messages: messages as unknown as SavedMessage[],
      provider,
      createdAt:
        history.find((h) => h.id === sessionId)?.createdAt ||
        new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSession(session);
    setHistory(loadHistory());
  }, [messages, sessionId, provider]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    const newId = generateId();
    setSessionId(newId);
    setMessages([]);
    setShowHistory(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    setSessionId(session.id);
    setMessages(session.messages as Parameters<typeof setMessages>[0]);
    setProvider(session.provider as Provider);
    setShowHistory(false);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setHistory(loadHistory());
    if (id === sessionId) {
      handleNewChat();
    }
  };

  const handleExportWord = () => {
    const title = extractTitle(messages as unknown as SavedMessage[]);
    exportToWord(title, messages as unknown as SavedMessage[]);
  };

  const handleExportExcel = () => {
    const title = extractTitle(messages as unknown as SavedMessage[]);
    exportToExcel(title, messages as unknown as SavedMessage[]);
  };

  const handleExportText = () => {
    const title = extractTitle(messages as unknown as SavedMessage[]);
    exportToCSV(title, messages as unknown as SavedMessage[]);
  };

  const renderMessageParts = (message: (typeof messages)[number]) => {
    return message.parts.map((part, i) => {
      if (part.type === "text") {
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part.text}
          </span>
        );
      }
      if (part.type.startsWith("tool-")) {
        const toolPart = part as {
          type: string;
          state: string;
          output?: unknown;
        };
        const toolName = toolPart.type.replace("tool-", "");
        const isToolLoading =
          toolPart.state === "input-streaming" ||
          toolPart.state === "input-available" ||
          toolPart.state === "call";

        if (isToolLoading) {
          const labelMap: Record<string, string> = {
            researchIngredient: "Gemini AI で成分を調査中...",
            checkRegulation: "規制チェッカーで規制を調査中...",
            checkSafety: "CosmeCheck で安全性を確認中...",
          };
          const colorMap: Record<string, [string, string]> = {
            researchIngredient: ["border-blue-200 bg-blue-50", "text-blue-500"],
            checkRegulation: ["border-violet-200 bg-violet-50", "text-violet-500"],
            checkSafety: ["border-stone-200 bg-stone-50", "text-stone-500"],
          };
          const label = labelMap[toolName] || "処理中...";
          const borderColor = (colorMap[toolName] || colorMap.checkSafety)[0];
          const textColor = (colorMap[toolName] || colorMap.checkSafety)[1];

          return (
            <div
              key={i}
              className={`my-3 rounded-xl border ${borderColor} px-4 py-3`}
            >
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`${textColor} animate-spin`}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <span className={`text-xs ${textColor}`}>{label}</span>
              </div>
            </div>
          );
        }

        if (toolPart.state === "output-available" && toolPart.output) {
          if (toolName === "checkRegulation") {
            return (
              <div key={i} className="my-3">
                <RegulationResult
                  data={
                    toolPart.output as Parameters<
                      typeof RegulationResult
                    >[0]["data"]
                  }
                />
              </div>
            );
          }
          if (toolName === "researchIngredient") {
            return (
              <div key={i} className="my-3">
                <ResearchResult
                  data={
                    toolPart.output as Parameters<
                      typeof ResearchResult
                    >[0]["data"]
                  }
                />
              </div>
            );
          }
          return (
            <div key={i} className="my-3">
              <SafetyResult
                data={
                  toolPart.output as Parameters<typeof SafetyResult>[0]["data"]
                }
              />
            </div>
          );
        }
      }
      return null;
    });
  };

  return (
    <div className="flex flex-col h-dvh bg-stone-50">
      {/* History Sidebar */}
      {showHistory && (
        <HistorySidebar
          sessions={history}
          currentId={sessionId}
          onSelect={handleSelectSession}
          onDelete={handleDeleteSession}
          onNew={handleNewChat}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
              title="履歴"
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
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div>
              <h1 className="text-base font-semibold text-stone-900 tracking-tight">
                Formulation Lab
              </h1>
              <p className="text-xs text-stone-500">
                安全性重視の処方開発アシスタント
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export */}
            {messages.length > 0 && (
              <ExportMenu
                onExportWord={handleExportWord}
                onExportExcel={handleExportExcel}
                onExportText={handleExportText}
              />
            )}

            {/* New Chat */}
            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
              title="新しい相談"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Model Toggle */}
            <button
              onClick={() => setProvider("gemini")}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                provider === "gemini"
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200"
              } disabled:opacity-50`}
            >
              Gemini
            </button>
            <button
              onClick={() => setProvider("claude")}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                provider === "claude"
                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                  : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200"
              } disabled:opacity-50`}
            >
              Claude
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-stone-900 mb-2">
                  処方設計を始めましょう
                </h2>
                <p className="text-stone-500 text-sm max-w-md">
                  安全性を最優先にしたベース処方設計から、
                  機能性成分の配合まで、処方開発をサポートします。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 hover:border-stone-400 hover:bg-stone-50 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-6 text-xs text-stone-400 mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ベース処方設計
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  機能性成分選定
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  安全性評価
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === "user"
                        ? "bg-stone-900 text-white rounded-2xl rounded-br-md px-4 py-3"
                        : "bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3 text-stone-800"
                    }`}
                  >
                    <div
                      className={`text-sm leading-relaxed ${
                        message.role === "assistant"
                          ? "prose prose-sm prose-stone max-w-none"
                          : ""
                      }`}
                    >
                      {renderMessageParts(message)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading &&
                messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-pulse [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-pulse [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="処方について相談してください..."
              rows={1}
              className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 pr-12 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-stone-900 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-700 transition-colors"
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
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-stone-400 mt-2">
            {provider === "gemini" ? "Gemini" : "Claude"} +
            CosmeCheck連携 | 自動保存
          </p>
        </div>
      </footer>
    </div>
  );
}
