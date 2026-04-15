import type {
  FocusType,
  ThreadFocusCard,
  WorkStateKey
} from "./thread-focus-card.js";

export type ThreadContextKind = "workspace" | "skill" | "repo";

export interface ThreadContextRef {
  kind: ThreadContextKind;
  label: string;
  path: string | null;
}

export interface ThreadWorkstreamNode {
  threadId: string;
  title: string;
  focusName: string;
  focusType: FocusType;
  statusKey: WorkStateKey;
  statusLabel: string;
  workspacePath: string | null;
  contextRefs: ThreadContextRef[];
}

export type ThreadLinkType =
  | "same_goal"
  | "next_step"
  | "experiment_branch"
  | "verification_branch"
  | "skill_source"
  | "workspace_handoff"
  | "blocked_by"
  | "duplicate_of"
  | "superseded_by";

export const THREAD_LINK_LABELS: Record<ThreadLinkType, string> = {
  same_goal: "同一目标",
  next_step: "下一步",
  experiment_branch: "实验分支",
  verification_branch: "验证分支",
  skill_source: "技能来源",
  workspace_handoff: "跨目录接力",
  blocked_by: "受阻于",
  duplicate_of: "重复线程",
  superseded_by: "已被替代"
};

export interface ThreadWorkstreamLink {
  fromThreadId: string;
  toThreadId: string;
  type: ThreadLinkType;
  label: string;
  reason: string;
  confidence: number;
}

export interface ThreadWorkstreamFrontier {
  activeThreadIds: string[];
  blockedThreadIds: string[];
  parkedThreadIds: string[];
  nextSuggestedThreadId: string | null;
}

export interface ThreadWorkstreamGraph {
  workstreamId: string;
  goal: string;
  anchorFocusName: string;
  rootThreadId: string;
  nodes: ThreadWorkstreamNode[];
  links: ThreadWorkstreamLink[];
  frontier: ThreadWorkstreamFrontier;
}

export interface BuildThreadWorkstreamNodeInput {
  card: ThreadFocusCard;
  workspacePath?: string | null;
  contextRefs?: ThreadContextRef[];
}

export interface BuildThreadWorkstreamLinkInput {
  fromThreadId: string;
  toThreadId: string;
  type: ThreadLinkType;
  reason: string;
  confidence?: number;
}

export interface BuildThreadWorkstreamGraphInput {
  workstreamId: string;
  goal: string;
  rootThreadId: string;
  nodes: ThreadWorkstreamNode[];
  links: ThreadWorkstreamLink[];
}

export function buildThreadWorkstreamNode(
  input: BuildThreadWorkstreamNodeInput
): ThreadWorkstreamNode {
  return {
    threadId: input.card.threadId,
    title: input.card.title,
    focusName: input.card.focus.name,
    focusType: input.card.focus.type,
    statusKey: input.card.statusKey,
    statusLabel: input.card.statusLabel,
    workspacePath: input.workspacePath ?? null,
    contextRefs: input.contextRefs ?? []
  };
}

export function buildThreadWorkstreamLink(
  input: BuildThreadWorkstreamLinkInput
): ThreadWorkstreamLink {
  return {
    fromThreadId: input.fromThreadId,
    toThreadId: input.toThreadId,
    type: input.type,
    label: toThreadLinkLabel(input.type),
    reason: input.reason,
    confidence: input.confidence ?? 1
  };
}

export function buildThreadWorkstreamGraph(
  input: BuildThreadWorkstreamGraphInput
): ThreadWorkstreamGraph {
  const rootNode = input.nodes.find((node) => node.threadId === input.rootThreadId);

  return {
    workstreamId: input.workstreamId,
    goal: input.goal,
    anchorFocusName: rootNode?.focusName ?? "待人工确认",
    rootThreadId: input.rootThreadId,
    nodes: input.nodes,
    links: input.links,
    frontier: selectWorkstreamFrontier(input.nodes, input.links)
  };
}

export function selectWorkstreamFrontier(
  nodes: ThreadWorkstreamNode[],
  links: ThreadWorkstreamLink[]
): ThreadWorkstreamFrontier {
  const parkedThreadIds = nodes
    .filter((node) => isParkedThread(node.threadId, node.statusKey, links))
    .map((node) => node.threadId);

  const openNodes = nodes.filter((node) => !parkedThreadIds.includes(node.threadId));

  const blockedThreadIds = openNodes
    .filter((node) => isBlockedThread(node.threadId, nodes, links))
    .map((node) => node.threadId);

  const activeThreadIds = openNodes
    .filter((node) => !blockedThreadIds.includes(node.threadId))
    .map((node) => node.threadId);

  return {
    activeThreadIds,
    blockedThreadIds,
    parkedThreadIds,
    nextSuggestedThreadId: activeThreadIds[0] ?? blockedThreadIds[0] ?? null
  };
}

export function toThreadLinkLabel(type: ThreadLinkType): string {
  return THREAD_LINK_LABELS[type];
}

function isParkedThread(
  threadId: string,
  statusKey: WorkStateKey,
  links: ThreadWorkstreamLink[]
): boolean {
  if (statusKey === "done" || statusKey === "paused") {
    return true;
  }

  return links.some(
    (link) =>
      link.fromThreadId === threadId &&
      (link.type === "duplicate_of" || link.type === "superseded_by")
  );
}

function isBlockedThread(
  threadId: string,
  nodes: ThreadWorkstreamNode[],
  links: ThreadWorkstreamLink[]
): boolean {
  return links.some(
    (link) =>
      link.fromThreadId === threadId &&
      link.type === "blocked_by" &&
      isOpenThread(link.toThreadId, nodes)
  );
}

function isOpenThread(threadId: string, nodes: ThreadWorkstreamNode[]): boolean {
  const node = nodes.find((currentNode) => currentNode.threadId === threadId);
  if (!node) {
    return false;
  }

  return node.statusKey !== "done" && node.statusKey !== "paused";
}
