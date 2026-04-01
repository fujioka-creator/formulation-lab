"use client";

import { useState } from "react";

interface Regulations {
  japan: string;
  eu: string;
  us: string;
  china: string;
  taiwan: string;
}

interface IngredientResult {
  name: string;
  inci: string;
  safetyRating: "安全" | "注意" | "警告";
  description: string;
  risks: string[];
  regulations: Regulations;
  maxConcentration: string;
  notes: string;
}

interface AnalysisResult {
  ingredients: IngredientResult[];
  overallAssessment: string;
  combinationWarnings: string[];
  knowledgeSource?: string;
  error?: string;
}

function SafetyBadge({ rating }: { rating: string }) {
  const styles = {
    安全: "bg-emerald-50 text-emerald-700 border-emerald-200",
    注意: "bg-amber-50 text-amber-700 border-amber-200",
    警告: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[rating as keyof typeof styles] || "bg-stone-100 text-stone-600 border-stone-200"}`}
    >
      {rating}
    </span>
  );
}

function IngredientCard({ ingredient }: { ingredient: IngredientResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SafetyBadge rating={ingredient.safetyRating} />
          <span className="text-sm font-medium text-stone-800">
            {ingredient.name}
          </span>
          {ingredient.inci && (
            <span className="text-xs text-stone-400">{ingredient.inci}</span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-stone-100 space-y-2">
          <p className="text-xs text-stone-600 mt-2">
            {ingredient.description}
          </p>

          {ingredient.maxConcentration && (
            <p className="text-xs text-stone-500">
              <span className="font-medium">推奨最大配合量:</span>{" "}
              {ingredient.maxConcentration}
            </p>
          )}

          {ingredient.risks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-500 mb-1">
                リスク:
              </p>
              <ul className="space-y-0.5">
                {ingredient.risks.map((risk, i) => (
                  <li key={i} className="text-xs text-red-600 flex gap-1">
                    <span className="shrink-0">-</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-stone-500 mb-1">
              各国規制:
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(ingredient.regulations).map(([key, val]) => {
                const labels: Record<string, string> = {
                  japan: "日本",
                  eu: "EU",
                  us: "米国",
                  china: "中国",
                  taiwan: "台湾",
                };
                return (
                  <div key={key} className="flex gap-1">
                    <span className="font-medium text-stone-500 shrink-0">
                      {labels[key]}:
                    </span>
                    <span className="text-stone-600">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {ingredient.notes && (
            <p className="text-xs text-stone-500 italic">
              {ingredient.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SafetyResult({ data }: { data: AnalysisResult }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700 font-medium">
          安全性チェックエラー
        </p>
        <p className="text-xs text-red-600 mt-1">{data.error}</p>
      </div>
    );
  }

  if (!data.ingredients || data.ingredients.length === 0) {
    return null;
  }

  const counts = {
    safe: data.ingredients.filter((i) => i.safetyRating === "安全").length,
    caution: data.ingredients.filter((i) => i.safetyRating === "注意").length,
    warning: data.ingredients.filter((i) => i.safetyRating === "警告").length,
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-stone-600"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span className="text-sm font-semibold text-stone-800">
          CosmeCheck 安全性レポート
        </span>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 flex items-center gap-4 border-b border-stone-100">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-stone-600">安全 {counts.safe}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-stone-600">注意 {counts.caution}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-stone-600">警告 {counts.warning}</span>
        </div>
      </div>

      {/* Ingredients */}
      <div className="p-3 space-y-2">
        {data.ingredients.map((ingredient, i) => (
          <IngredientCard key={i} ingredient={ingredient} />
        ))}
      </div>

      {/* Combination Warnings */}
      {data.combinationWarnings && data.combinationWarnings.length > 0 && (
        <div className="px-4 py-3 border-t border-stone-100 bg-amber-50/50">
          <p className="text-xs font-medium text-amber-700 mb-1">
            成分の組み合わせ注意:
          </p>
          <ul className="space-y-1">
            {data.combinationWarnings.map((warning, i) => (
              <li key={i} className="text-xs text-amber-600">
                - {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Assessment */}
      {data.overallAssessment && (
        <div className="px-4 py-3 border-t border-stone-200 bg-stone-50">
          <p className="text-xs font-medium text-stone-500 mb-1">総合評価:</p>
          <p className="text-xs text-stone-700">{data.overallAssessment}</p>
        </div>
      )}

      {/* Knowledge source */}
      {data.knowledgeSource && (
        <div className="px-4 py-2 border-t border-stone-100">
          <p className="text-[10px] text-stone-400">{data.knowledgeSource}</p>
        </div>
      )}
    </div>
  );
}
