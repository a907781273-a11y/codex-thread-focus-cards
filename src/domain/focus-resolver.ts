import type { CodeFocus, FocusType } from "./thread-focus-card.js";

export type MessagePhase = "commentary" | "final_answer" | null;

export type ExplicitThreadItem =
  | {
      type: "userMessage";
      text: string;
    }
  | {
      type: "agentMessage";
      text: string;
      phase: MessagePhase;
    }
  | {
      type: "plan";
      text: string;
    }
  | {
      type: "fileChange";
      file: string;
      symbols: string[];
    };

export interface FocusCandidate {
  type: FocusType;
  name: string;
  file: string | null;
  score: number;
  evidence: string;
}

const FILE_CHANGE_BASE_SCORE = 100;
const AGENT_MESSAGE_BASE_SCORE = 60;
const PLAN_BASE_SCORE = 40;

export function rankFocusCandidates(
  candidates: FocusCandidate[]
): FocusCandidate[] {
  return [...candidates].sort((left, right) => right.score - left.score);
}

export function resolveBestFocus(
  candidates: FocusCandidate[]
): CodeFocus | null {
  const [best] = rankFocusCandidates(candidates);
  if (!best) {
    return null;
  }

  return {
    type: best.type,
    name: best.name,
    file: best.file
  };
}

export function collectFocusCandidates(
  items: ExplicitThreadItem[]
): FocusCandidate[] {
  const candidates: FocusCandidate[] = [];

  for (const item of items) {
    if (item.type === "fileChange") {
      for (const symbol of item.symbols) {
        candidates.push({
          type: inferFocusType(symbol),
          name: symbol,
          file: item.file,
          score: FILE_CHANGE_BASE_SCORE,
          evidence: "fileChange"
        });
      }
      continue;
    }

    if (item.type === "agentMessage") {
      const symbol = extractExplicitSymbol(item.text);
      if (symbol) {
        candidates.push({
          type: inferFocusType(symbol),
          name: symbol,
          file: null,
          score: AGENT_MESSAGE_BASE_SCORE,
          evidence: "agentMessage"
        });
      }
      continue;
    }

    if (item.type === "plan") {
      const symbol = extractExplicitSymbol(item.text);
      if (symbol) {
        candidates.push({
          type: inferFocusType(symbol),
          name: symbol,
          file: null,
          score: PLAN_BASE_SCORE,
          evidence: "plan"
        });
      }
    }
  }

  return candidates;
}

export function extractExplicitSymbol(text: string): string | null {
  const patterns = [
    /[A-Z][A-Za-z0-9_]+\.[A-Za-z0-9_]+/,
    /[A-Za-z0-9_]+\.[A-Za-z0-9_]+/,
    /[A-Za-z0-9_]+#[A-Za-z0-9_]+/,
    /(GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9/_:-]+/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

export function inferFocusType(symbol: string): FocusType {
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+\//.test(symbol)) {
    return "路由";
  }

  if (symbol.includes("#")) {
    return "方法";
  }

  if (symbol.includes(".") && /^[A-Z]/.test(symbol)) {
    return "方法";
  }

  if (symbol.includes(".")) {
    return "函数";
  }

  return "模块";
}

