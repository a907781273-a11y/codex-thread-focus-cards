export type FocusType =
  | "函数"
  | "方法"
  | "类"
  | "路由"
  | "配置键"
  | "SQL"
  | "模块"
  | "流程";

export type WorkStateKey =
  | "not_started"
  | "reading_requirements"
  | "locating_entry"
  | "reading_interface"
  | "reading_object"
  | "stitching_flow"
  | "editing_interface"
  | "editing_object"
  | "filling_state"
  | "running_verification"
  | "waiting_tool_result"
  | "waiting_user_decision"
  | "done"
  | "paused";

export const WORK_STATE_LABELS: Record<WorkStateKey, string> = {
  not_started: "待开始",
  reading_requirements: "在看需求",
  locating_entry: "在定位入口",
  reading_interface: "在看接口",
  reading_object: "在看对象",
  stitching_flow: "在串流程",
  editing_interface: "在改接口",
  editing_object: "在改对象",
  filling_state: "在补状态",
  running_verification: "在跑验证",
  waiting_tool_result: "等待工具结果",
  waiting_user_decision: "等待你决定",
  done: "已完成",
  paused: "已搁置"
};

export interface CodeFocus {
  type: FocusType;
  name: string;
  file: string | null;
}

export interface ThreadFocusCard {
  threadId: string;
  title: string;
  focus: CodeFocus;
  statusKey: WorkStateKey;
  statusLabel: string;
  currentAction: string;
  nextStep: string;
  confirmedFacts: string[];
  blocker: string;
  latestVisibleOutput: string;
  sourceApis: string[];
}

export function toStatusLabel(statusKey: WorkStateKey): string {
  return WORK_STATE_LABELS[statusKey];
}

