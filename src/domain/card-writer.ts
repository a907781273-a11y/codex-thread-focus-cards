import {
  toStatusLabel,
  type CodeFocus,
  type ThreadFocusCard,
  type WorkStateKey
} from "./thread-focus-card.js";

export interface BuildThreadFocusCardInput {
  threadId: string;
  focus: CodeFocus;
  statusKey: WorkStateKey;
  currentAction: string;
  nextStep: string;
  confirmedFacts: string[];
  blocker?: string;
  latestVisibleOutput: string;
  sourceApis: string[];
}

export function buildThreadFocusCard(
  input: BuildThreadFocusCardInput
): ThreadFocusCard {
  return {
    threadId: input.threadId,
    title: buildTitle(input.focus),
    focus: input.focus,
    statusKey: input.statusKey,
    statusLabel: toStatusLabel(input.statusKey),
    currentAction: input.currentAction,
    nextStep: input.nextStep,
    confirmedFacts: input.confirmedFacts,
    blocker: input.blocker ?? "无",
    latestVisibleOutput: input.latestVisibleOutput,
    sourceApis: input.sourceApis
  };
}

function buildTitle(focus: CodeFocus): string {
  return `收敛 ${focus.name} 的线程工作卡`;
}

