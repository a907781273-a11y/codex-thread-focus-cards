const state = {
  dataset: null,
  selectedThreadId: null,
  providerStatus: null,
  dataSource: "fallback",
  lastError: null,
  busy: false
};

const heroEl = document.getElementById("hero");
const providerPanelEl = document.getElementById("providerPanel");
const lanesEl = document.getElementById("lanes");
const detailPanelEl = document.getElementById("detailPanel");
const relationGridEl = document.getElementById("relationGrid");

boot().catch((error) => {
  detailPanelEl.innerHTML = `
    <div class="empty-state">
      数据没加载出来。<br />
      ${escapeHtml(error.message)}
    </div>
  `;
});

async function boot() {
  const [statusResponse, fallbackResponse] = await Promise.all([
    fetch("/api/provider/status", { cache: "no-store" }),
    fetch("../examples/demo-thread-workbench.json", {
      cache: "no-store"
    })
  ]);

  if (!statusResponse.ok) {
    throw new Error(`无法读取 provider 状态，HTTP ${statusResponse.status}`);
  }

  if (!fallbackResponse.ok) {
    throw new Error(`无法读取 demo 数据，HTTP ${fallbackResponse.status}`);
  }

  state.providerStatus = await statusResponse.json();
  state.dataset = await fallbackResponse.json();
  state.dataSource = "fallback";
  state.selectedThreadId = state.dataset.graph.frontier.next_suggested_thread_id
    || state.dataset.cards[0]?.thread_id
    || null;

  render();
}

function render() {
  renderHero();
  renderProviderPanel();
  renderLanes();
  renderDetail();
  renderRelations();
}

function renderProviderPanel() {
  const status = state.providerStatus;
  const configured = Boolean(status?.configured);
  const busy = state.busy;
  const sourceLabel = state.dataSource === "provider"
    ? `当前结果来自 ${status?.provider_name || "外部供应商"}`
    : "当前结果来自本地静态样例";

  providerPanelEl.innerHTML = `
    <div class="provider-row">
      <div>
        <span class="eyebrow">总结责任</span>
        <h2 class="lane-title">${configured ? "外部 LLM 已就绪" : "外部 LLM 还没配置"}</h2>
        <p class="provider-copy">
          ${configured
            ? `现在不是 Codex 自己总结。页面会把显式线程源数据发给 ${escapeHtml(status.provider_name)}，再把它返回的 cards 和 graph 渲染出来。`
            : "现在还在用本地静态样例展示页面，因为你还没给外部供应商的 API Key、Base URL 和模型名。"}
        </p>
        <p class="provider-copy">
          ${escapeHtml(sourceLabel)}
          ${state.lastError ? `。上次调用失败：${state.lastError}` : ""}
        </p>
      </div>
      <div class="provider-actions">
        <button
          type="button"
          class="provider-button"
          id="analyzeButton"
          ${configured && !busy ? "" : "disabled"}
        >
          ${busy ? "正在调用外部 LLM..." : "用外部 LLM 重新分析"}
        </button>
      </div>
    </div>
    <div class="hero-metrics">
      <div class="metric">
        <span class="metric-label">供应商</span>
        <div class="metric-value">${escapeHtml(status?.provider_name || "未配置")}</div>
      </div>
      <div class="metric">
        <span class="metric-label">模型</span>
        <div class="metric-value">${escapeHtml(status?.model || "未配置")}</div>
      </div>
      <div class="metric">
        <span class="metric-label">输入源</span>
        <div class="metric-value">${escapeHtml(status?.source_file || "未知")}</div>
      </div>
      <div class="metric">
        <span class="metric-label">回退源</span>
        <div class="metric-value">${escapeHtml(status?.fallback_file || "未知")}</div>
      </div>
    </div>
  `;

  const analyzeButton = document.getElementById("analyzeButton");
  if (analyzeButton) {
    analyzeButton.addEventListener("click", analyzeWithProvider);
  }
}

async function analyzeWithProvider() {
  state.busy = true;
  state.lastError = null;
  renderProviderPanel();

  try {
    const response = await fetch("/api/provider/analyze", {
      cache: "no-store",
      method: "POST"
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `外部分析失败，HTTP ${response.status}`);
    }

    state.dataset = payload.dataset;
    state.dataSource = "provider";
    state.selectedThreadId = state.dataset.graph.frontier.next_suggested_thread_id
      || state.dataset.cards[0]?.thread_id
      || null;
    render();
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : "外部分析失败。";
    renderProviderPanel();
  } finally {
    state.busy = false;
    renderProviderPanel();
  }
}

function renderHero() {
  const { graph, cards } = state.dataset;
  const nextThread = getCardById(graph.frontier.next_suggested_thread_id);

  heroEl.innerHTML = `
    <div class="hero-grid">
      <div>
        <span class="eyebrow">线程工作流图 Demo</span>
        <h1 class="hero-title">${escapeHtml(graph.goal)}</h1>
        <p class="hero-copy">
          这不是在记很多线程，而是在看一条工作流现在推进到哪。页面会先告诉你主线、阻塞和可停放线程，再指出最该切回去的那一条。你配好外部供应商以后，卡片和关系图会由外部 LLM 生成，不再是 Codex 本身写死。
        </p>
      </div>
      <div class="hero-card">
        <span class="tiny-label">推荐先切回</span>
        <div class="metric-value">${escapeHtml(nextThread?.title || "无")}</div>
        <p class="hero-copy">
          ${escapeHtml(nextThread?.next_step || "当前示例没有下一步说明。")}
        </p>
      </div>
    </div>
    <div class="hero-metrics">
      <div class="metric">
        <span class="metric-label">工作流锚点</span>
        <div class="metric-value">${escapeHtml(graph.anchor_focus_name)}</div>
      </div>
      <div class="metric">
        <span class="metric-label">活动线程</span>
        <div class="metric-value">${graph.frontier.active_thread_ids.length} 条</div>
      </div>
      <div class="metric">
        <span class="metric-label">阻塞线程</span>
        <div class="metric-value">${graph.frontier.blocked_thread_ids.length} 条</div>
      </div>
      <div class="metric">
        <span class="metric-label">已停放线程</span>
        <div class="metric-value">${graph.frontier.parked_thread_ids.length} 条</div>
      </div>
      <div class="metric">
        <span class="metric-label">总线程</span>
        <div class="metric-value">${cards.length} 条</div>
      </div>
    </div>
  `;
}

function renderLanes() {
  const { graph } = state.dataset;
  const groups = [
    {
      key: "active",
      title: "现在能继续做",
      ids: graph.frontier.active_thread_ids
    },
    {
      key: "blocked",
      title: "现在先别切",
      ids: graph.frontier.blocked_thread_ids
    },
    {
      key: "parked",
      title: "先放下别占脑子",
      ids: graph.frontier.parked_thread_ids
    }
  ];

  lanesEl.innerHTML = groups
    .map((group) => {
      const cards = group.ids.map((id) => getCardById(id)).filter(Boolean);
      return `
        <section class="lane" data-lane="${group.key}">
          <span class="eyebrow">${group.key}</span>
          <h3 class="lane-title">${group.title}</h3>
          <div class="thread-list">
            ${cards.length
              ? cards.map(renderThreadButton).join("")
              : `<div class="empty-state">这组现在没有线程。</div>`}
          </div>
        </section>
      `;
    })
    .join("");

  lanesEl.querySelectorAll(".thread-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedThreadId = button.dataset.threadId;
      render();
    });
  });
}

function renderThreadButton(card) {
  const selected = card.thread_id === state.selectedThreadId;
  return `
    <button
      type="button"
      class="thread-button ${selected ? "is-selected" : ""}"
      data-thread-id="${escapeHtml(card.thread_id)}"
    >
      <div class="thread-header">
        <div class="thread-title">${escapeHtml(card.title)}</div>
        <span class="status-pill" data-tone="${statusTone(card.status_key)}">
          ${escapeHtml(card.status_label)}
        </span>
      </div>
      <div class="thread-focus">${escapeHtml(card.focus_name)}</div>
      <p class="thread-focus">下一步：${escapeHtml(card.next_step)}</p>
    </button>
  `;
}

function renderDetail() {
  const card = getCardById(state.selectedThreadId);

  if (!card) {
    detailPanelEl.innerHTML = `<div class="empty-state">还没有选中线程。</div>`;
    return;
  }

  const relatedLinks = getLinksForThread(card.thread_id);
  const graphNode = getGraphNodeById(card.thread_id);

  detailPanelEl.innerHTML = `
    <div class="detail-stack">
      <div>
        <span class="eyebrow">当前线程</span>
        <div class="detail-focus">
          <h2 class="detail-title">${escapeHtml(card.title)}</h2>
          <span class="status-pill" data-tone="${statusTone(card.status_key)}">
            ${escapeHtml(card.status_label)}
          </span>
        </div>
        <p class="detail-copy">
          这条线程现在盯着 <strong>${escapeHtml(card.focus_name)}</strong>，
          当前动作是“${escapeHtml(card.current_action)}”。
        </p>
      </div>
      <div class="detail-grid">
        <section class="detail-block">
          <h3>代码焦点</h3>
          <div class="detail-meta">
            <div>
              <div>${escapeHtml(card.focus_name)}</div>
              <div class="thread-focus">${escapeHtml(card.focus_type)}</div>
            </div>
            <div class="thread-focus">${escapeHtml(card.focus_file || "未标注文件")}</div>
          </div>
        </section>
        <section class="detail-block">
          <h3>下一步</h3>
          <div>${escapeHtml(card.next_step)}</div>
          <div class="thread-focus">阻塞：${escapeHtml(card.blocker)}</div>
        </section>
      </div>
      <section class="detail-block">
        <h3>已确认事实</h3>
        <ul class="detail-list">
          ${card.confirmed_facts.map((fact) => `<li class="fact-item">${escapeHtml(fact)}</li>`).join("")}
        </ul>
      </section>
      <section class="detail-block">
        <h3>最近可见输出</h3>
        <div class="detail-copy">${escapeHtml(card.latest_visible_output)}</div>
      </section>
      <section class="detail-block">
        <h3>线程上下文</h3>
        ${graphNode?.context_refs?.length
          ? `<ul class="detail-list">
              ${graphNode.context_refs.map((ref) => `
                <li class="context-item">${escapeHtml(ref.kind)} / ${escapeHtml(ref.label)} / ${escapeHtml(ref.path || "无路径")}</li>
              `).join("")}
            </ul>`
          : `<div class="thread-focus">没有额外上下文引用。</div>`}
      </section>
      <section class="detail-block">
        <h3>它为什么在这里</h3>
        ${relatedLinks.length
          ? `<div class="pill-row">
              ${relatedLinks.map((link) => `<span class="link-pill">${escapeHtml(link.label)}</span>`).join("")}
            </div>
            <ul class="detail-list">
              ${relatedLinks.map((link) => `
                <li class="context-item">
                  ${escapeHtml(directionFor(card.thread_id, link))}
                  ：${escapeHtml(link.reason)}
                </li>
              `).join("")}
            </ul>`
          : `<div class="thread-focus">这条线程目前还没有挂上关系边。</div>`}
      </section>
    </div>
  `;
}

function renderRelations() {
  const { graph } = state.dataset;
  const selectedId = state.selectedThreadId;

  relationGridEl.innerHTML = graph.links
    .map((link) => {
      const fromCard = getCardById(link.from_thread_id);
      const toCard = getCardById(link.to_thread_id);
      const active = link.from_thread_id === selectedId || link.to_thread_id === selectedId;
      return `
        <article class="relation-card" data-active="${active}">
          <div class="relation-card-header">
            <span class="link-pill">${escapeHtml(link.label)}</span>
            <span class="tiny-label">${Math.round(link.confidence * 100)}%</span>
          </div>
          <p class="relation-direction">
            ${escapeHtml(fromCard?.focus_name || link.from_thread_id)}
            → ${escapeHtml(toCard?.focus_name || link.to_thread_id)}
          </p>
          <p class="relation-reason">${escapeHtml(link.reason)}</p>
        </article>
      `;
    })
    .join("");
}

function getCardById(threadId) {
  return state.dataset.cards.find((card) => card.thread_id === threadId) || null;
}

function getGraphNodeById(threadId) {
  return state.dataset.graph.nodes.find((node) => node.thread_id === threadId) || null;
}

function getLinksForThread(threadId) {
  return state.dataset.graph.links.filter(
    (link) => link.from_thread_id === threadId || link.to_thread_id === threadId
  );
}

function directionFor(threadId, link) {
  const fromCard = getCardById(link.from_thread_id);
  const toCard = getCardById(link.to_thread_id);

  if (link.from_thread_id === threadId) {
    return `${link.label} -> ${toCard?.focus_name || link.to_thread_id}`;
  }

  return `${fromCard?.focus_name || link.from_thread_id} -> ${link.label}`;
}

function statusTone(statusKey) {
  if (["editing_interface", "editing_object", "reading_interface", "reading_object", "stitching_flow", "locating_entry", "running_verification"].includes(statusKey)) {
    return "green";
  }

  if (["waiting_tool_result", "waiting_user_decision"].includes(statusKey)) {
    return "yellow";
  }

  return "gray";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
