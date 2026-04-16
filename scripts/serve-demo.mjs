import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"]
]);

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/provider/status") {
    return sendJson(response, 200, getProviderStatus());
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/provider/analyze") {
    return handleProviderAnalyze(response);
  }

  const relativePath = mapRequestPath(requestUrl.pathname);
  const absolutePath = path.resolve(repoRoot, `.${relativePath}`);

  if (!absolutePath.startsWith(repoRoot)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(absolutePath);
    const extension = path.extname(absolutePath);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(extension) || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Not found: ${relativePath}`);
  }
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`Thread focus demo is running at ${url}`);
  console.log("Press Ctrl+C to stop.");
});

function mapRequestPath(pathname) {
  if (pathname === "/") {
    return "/demo/index.html";
  }

  if (pathname === "/demo") {
    return "/demo/index.html";
  }

  return pathname.endsWith("/") ? `${pathname}index.html` : pathname;
}

async function handleProviderAnalyze(response) {
  const provider = getProviderConfig();

  if (!provider.configured) {
    return sendJson(response, 400, {
      error: "外部 LLM 还没配置。请先设置 API Key、Base URL 和模型名。"
    });
  }

  try {
    const sourceText = await readFile(
      path.resolve(repoRoot, "examples/provider-thread-source.json"),
      "utf8"
    );
    const source = JSON.parse(sourceText);
    const analysis = await analyzeWithExternalProvider(provider, source);
    return sendJson(response, 200, {
      provider: provider.publicName,
      dataset: analysis
    });
  } catch (error) {
    return sendJson(response, 502, {
      error: error instanceof Error ? error.message : "外部 LLM 调用失败。"
    });
  }
}

function getProviderStatus() {
  const provider = getProviderConfig();
  return {
    configured: provider.configured,
    provider_name: provider.publicName,
    model: provider.model,
    base_url: provider.baseUrl,
    source_file: "examples/provider-thread-source.json",
    fallback_file: "examples/demo-thread-workbench.json"
  };
}

function getProviderConfig() {
  const apiKey = process.env.THREAD_FOCUS_LLM_API_KEY || process.env.OPENAI_API_KEY || "";
  const baseUrl = (process.env.THREAD_FOCUS_LLM_BASE_URL || "").replace(/\/$/, "");
  const model = process.env.THREAD_FOCUS_LLM_MODEL || "";
  const publicName = process.env.THREAD_FOCUS_LLM_NAME || "外部 OpenAI-compatible 供应商";

  return {
    apiKey,
    baseUrl,
    model,
    publicName,
    configured: Boolean(apiKey && baseUrl && model)
  };
}

async function analyzeWithExternalProvider(provider, source) {
  const prompt = buildProviderPrompt(source);
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是线程工作流分析器。你的任务不是写长摘要，而是基于显式输出生成 JSON 卡片和线程关系图。不要输出 markdown，不要解释，只输出一个 JSON 对象。"
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`供应商接口返回 ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const payload = await response.json();
  const message = payload?.choices?.[0]?.message?.content;

  if (typeof message !== "string" || !message.trim()) {
    throw new Error("供应商没有返回可解析的文本结果。");
  }

  const parsed = parseJsonFromText(message);
  validateWorkstreamDataset(parsed);
  return parsed;
}

function buildProviderPrompt(source) {
  return [
    "请读取下面的显式线程源数据，生成一个 JSON 对象，顶层必须只有 cards 和 graph 两个字段。",
    "目标不是自由摘要，而是恢复心流：告诉用户每条线程在做什么、线程之间怎么接、应该先切哪条。",
    "硬约束：",
    "1. 只允许使用 userMessage、agentMessage、plan、fileChange、workspace_path、context_refs、source_apis。",
    "2. 忽略 reasoning、命令全文、工具全文。",
    "3. focus_name 必须是具体代码符号、路由、配置键或模块名，不能写 thread/read、优化、推进、闭环。",
    "4. status_label 只能从这些值里选：待开始、在看需求、在定位入口、在看接口、在看对象、在串流程、在改接口、在改对象、在补状态、在跑验证、等待工具结果、等待你决定、已完成、已搁置。",
    "5. graph.links.type 只能从这些值里选：same_goal、next_step、experiment_branch、verification_branch、skill_source、workspace_handoff、blocked_by、duplicate_of、superseded_by。",
    "6. graph.frontier 里要给 active_thread_ids、blocked_thread_ids、parked_thread_ids、next_suggested_thread_id。",
    "7. 所有说明用简体中文，reason 要写清楚证据来自哪条显式输出。",
    "8. 直接输出 JSON，不要包代码块。",
    "",
    "输出结构示意：",
    JSON.stringify(
      {
        cards: [
          {
            thread_id: "thr_x",
            title: "收敛 Xxx 的线程工作卡",
            focus_type: "方法",
            focus_name: "XxxService.build",
            focus_file: "src/xxx.ts",
            status_key: "editing_object",
            status_label: "在改对象",
            current_action: "在补线程关系边",
            next_step: "补前沿线程规则",
            confirmed_facts: ["事实 1", "事实 2"],
            blocker: "无",
            latest_visible_output: "最后一段显式输出",
            source_apis: ["thread/read", "thread/list"]
          }
        ],
        graph: {
          workstream_id: "ws_x",
          goal: "一句人话描述目标",
          anchor_focus_name: "XxxService.build",
          root_thread_id: "thr_x",
          nodes: [
            {
              thread_id: "thr_x",
              title: "标题",
              focus_name: "XxxService.build",
              focus_type: "方法",
              status_key: "editing_object",
              status_label: "在改对象",
              workspace_path: "G:/temp/demo",
              context_refs: [
                {
                  kind: "workspace",
                  label: "demo repo",
                  path: "G:/temp/demo"
                }
              ]
            }
          ],
          links: [
            {
              from_thread_id: "thr_a",
              to_thread_id: "thr_b",
              type: "next_step",
              label: "下一步",
              reason: "显式输出里说下一步切到 thr_b。",
              confidence: 0.95
            }
          ],
          frontier: {
            active_thread_ids: ["thr_a"],
            blocked_thread_ids: ["thr_b"],
            parked_thread_ids: ["thr_c"],
            next_suggested_thread_id: "thr_a"
          }
        }
      },
      null,
      2
    ),
    "",
    "显式线程源数据：",
    JSON.stringify(source, null, 2)
  ].join("\n");
}

function parseJsonFromText(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("供应商返回的内容里没有完整 JSON。");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function validateWorkstreamDataset(dataset) {
  if (!dataset || typeof dataset !== "object") {
    throw new Error("供应商返回的不是对象。");
  }

  if (!Array.isArray(dataset.cards) || !dataset.graph || typeof dataset.graph !== "object") {
    throw new Error("供应商返回缺少 cards 或 graph。");
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}
