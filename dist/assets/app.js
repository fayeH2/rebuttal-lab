const STORAGE_KEY = "rebuttal-lab-config-v1";
const DRAFT_KEY = "rebuttal-lab-draft-v1";

const icons = {
  sliders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6M9 8h6m2 8h6"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V9m-5 5 5-5 5 5M5 3h14"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`,
};

const defaultConfig = () => ({
  version: 1,
  title: "Rebuttal Response · 2026",
  venue: "Demo Review System",
  paperId: "Paper #1842",
  paperTitle: "Structured Reasoning for Reliable Visual Understanding",
  instructions: "请逐条、客观地回应评审意见。回复仅用于澄清，不应包含匿名政策禁止的信息。所有字段将在截止时间前自动保存。",
  deadline: "2026-11-02T23:59",
  mode: "multi",
  rounds: 3,
  allowAttachments: true,
  fileTypes: ["pdf", "docx", "tex", "zip"],
  maxFileMB: 10,
  maxFiles: 3,
  maxPdfPages: 1,
  fields: [
    { id: crypto.randomUUID(), label: "Response to Reviewer #1", prompt: "回应主要问题、澄清误解，并指出论文中的对应位置。", limit: 2500, unit: "chars", required: true },
    { id: crypto.randomUUID(), label: "Response to Reviewer #2", prompt: "请保持专业、简洁，建议按评审问题逐点作答。", limit: 2500, unit: "chars", required: true },
  ],
});

const presets = {
  single: () => ({ ...defaultConfig(), title: "Single-response Rebuttal", mode: "single", allowAttachments: false, fields: [{ id: crypto.randomUUID(), label: "Author response", prompt: "请在一个回复框内完成全部回应。", limit: 5000, unit: "chars", required: true }] }),
  pdf: () => ({ ...defaultConfig(), title: "One-page PDF Rebuttal", mode: "single", allowAttachments: true, fileTypes: ["pdf"], maxFileMB: 5, maxFiles: 1, maxPdfPages: 1, fields: [{ id: crypto.randomUUID(), label: "Optional cover note", prompt: "可填写一段简短说明；正式回复请上传 PDF。", limit: 500, unit: "chars", required: false }] }),
  discussion: () => ({ ...defaultConfig(), title: "Interactive Author Discussion", mode: "conversation", rounds: 4, allowAttachments: true, fileTypes: ["pdf", "png", "jpg"], maxFileMB: 8, fields: [{ id: crypto.randomUUID(), label: "Reply to the discussion", prompt: "在当前讨论轮次中回复评审，可继续追加消息。", limit: 1500, unit: "chars", required: true }] }),
};

let config = loadConfig();
let route = location.hash === "#simulate" ? "simulate" : "builder";
let simDraft = loadDraft();
let selectedFiles = [];
let toastTimer;

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeConfig(saved || defaultConfig());
  } catch { return defaultConfig(); }
}

function normalizeConfig(value) {
  const base = defaultConfig();
  const c = { ...base, ...(value || {}) };
  c.fileTypes = Array.isArray(c.fileTypes) ? c.fileTypes : base.fileTypes;
  c.fields = Array.isArray(c.fields) && c.fields.length ? c.fields.map(f => ({ id: f.id || crypto.randomUUID(), label: "Reply", prompt: "", limit: 2000, unit: "chars", required: true, ...f })) : base.fields;
  return c;
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}

function saveConfig(show = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  document.querySelector("#save-state")?.replaceChildren(document.createTextNode("已保存至本机"));
  if (show) toast("方案已保存");
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(simDraft));
  const el = document.querySelector("#draft-state");
  if (el) el.textContent = `已自动保存 · ${new Date().toLocaleTimeString("zh-CN", {hour:"2-digit", minute:"2-digit"})}`;
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 1900);
}

function escapeHTML(s = "") {
  return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function fieldControl(label, key, value, options = {}) {
  const { type = "text", full = false, min, max, hint = "" } = options;
  return `<div class="field ${full ? "full" : ""}"><label for="${key}">${label}</label>${type === "textarea"
    ? `<textarea id="${key}" class="control" data-config="${key}">${escapeHTML(value)}</textarea>`
    : `<input id="${key}" class="control" data-config="${key}" type="${type}" value="${escapeHTML(value)}" ${min !== undefined ? `min="${min}"` : ""} ${max !== undefined ? `max="${max}"` : ""}/>`}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
}

function render() {
  if (route === "simulate") renderSimulator(); else renderBuilder();
}

function renderBuilder() {
  document.querySelector("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">R</div><div><strong>Rebuttal Lab</strong><small>Review Flow Studio</small></div></div>
        <nav class="nav" aria-label="主要导航">
          <button class="nav-button active" data-scroll="general">${icons.sliders}<span>方案配置</span></button>
          <button class="nav-button" data-open-sim>${icons.eye}<span>作者端模拟</span></button>
        </nav>
        <div class="sidebar-meta"><div><span class="saved-dot"></span><span id="save-state">已保存至本机</span></div><div>无需登录 · 文件不离开浏览器</div></div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><div class="crumb">Workspace / Configuration</div><div class="top-title" data-preview-value="title">${escapeHTML(config.title)}</div></div>
          <div class="actions">
            <button class="btn" id="import-btn">${icons.upload}<span>导入</span></button>
            <button class="btn" id="export-btn">${icons.download}<span>导出</span></button>
            <button class="btn primary" id="save-btn">${icons.save}<span>保存方案</span></button>
            <button class="btn orange" data-open-sim>开始模拟 ${icons.arrow}</button>
          </div>
        </header>
        <div class="workspace">
          <section class="hero">
            <div><div class="eyebrow">Protocol Builder</div><h1>设计一次真实的<br/>rebuttal 流程。</h1><p class="lead">把投稿系统里的字数、附件、回复结构和讨论轮次先配置出来，再切换到作者视角进行完整演练。</p></div>
            <div class="step-pill">01 配置规则&nbsp;&nbsp;→&nbsp;&nbsp;02 作者模拟&nbsp;&nbsp;→&nbsp;&nbsp;03 校验提交</div>
          </section>

          <div class="builder-grid">
            <div class="stack">
              <section class="card" id="general">
                <div class="card-head"><div><h2>基础信息</h2><p>定义作者进入页面时看到的上下文</p></div></div>
                <div class="card-body"><div class="form-grid">
                  ${fieldControl("方案名称", "title", config.title)}
                  ${fieldControl("会议 / 系统名称", "venue", config.venue)}
                  ${fieldControl("论文编号", "paperId", config.paperId)}
                  ${fieldControl("截止时间", "deadline", config.deadline, { type: "datetime-local" })}
                  ${fieldControl("论文标题", "paperTitle", config.paperTitle, { full: true })}
                  ${fieldControl("作者须知", "instructions", config.instructions, { type: "textarea", full: true })}
                </div></div>
              </section>

              <section class="card">
                <div class="card-head"><div><h2>回复形式</h2><p>选择一次性提交、多回复框或多轮讨论</p></div></div>
                <div class="card-body stack">
                  <div class="segmented" role="tablist">
                    <button class="segment ${config.mode === "single" ? "active" : ""}" data-mode="single">单次回复</button>
                    <button class="segment ${config.mode === "multi" ? "active" : ""}" data-mode="multi">多个回复框</button>
                    <button class="segment ${config.mode === "conversation" ? "active" : ""}" data-mode="conversation">多轮对话</button>
                  </div>
                  ${config.mode === "conversation" ? `<div class="field"><label for="rounds">最大讨论轮次</label><div class="unit-input"><input id="rounds" class="control" data-config="rounds" type="number" min="1" max="20" value="${config.rounds}"/><span class="unit-label">轮</span></div><span class="hint">模拟页会以消息流形式呈现当前讨论。</span></div>` : ""}
                  <div id="fields-editor">${renderFieldsEditor()}</div>
            ${config.mode === "multi" ? `<button class="add-dashed" id="add-field">＋ 添加回复框</button>` : ""}
                </div>
              </section>

              <section class="card">
                <div class="card-head"><div><h2>附件规则</h2><p>模拟 PDF、Word、LaTeX 与补充材料上传</p></div></div>
                <div class="card-body stack">
                  <div class="switch-row"><div class="switch-copy"><strong>允许上传附件</strong><small>开启后可限制类型、体积、数量与 PDF 页数</small></div><button aria-label="切换附件上传" class="switch ${config.allowAttachments ? "on" : ""}" id="attachment-switch"></button></div>
                  ${config.allowAttachments ? renderFileRules() : ""}
                </div>
              </section>

              <section class="card">
                <div class="card-head"><div><h2>快速模板</h2><p>以常见回复结构为起点，再自由调整</p></div></div>
                <div class="card-body"><div class="presets">
                  <button class="preset" data-preset="single"><strong>统一回复框</strong><small>一次提交，全部评审共享字符上限</small></button>
                  <button class="preset" data-preset="pdf"><strong>1 页 PDF</strong><small>单文件、页数与文件体积限制</small></button>
                  <button class="preset" data-preset="discussion"><strong>多轮讨论</strong><small>消息流式回复，按轮次持续沟通</small></button>
                </div></div>
              </section>
            </div>

            <aside class="preview-sticky">
              <section class="card preview-window">
                <div class="browser-bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i><div class="address">rebuttal-lab / author / preview</div></div>
                <div class="mini-preview">
                  <div class="preview-brand" data-preview-value="venue">${escapeHTML(config.venue)}</div>
                  <div class="mini-paper"><span class="mini-badge">${modeName(config.mode)}</span><h3 data-preview-value="paperTitle">${escapeHTML(config.paperTitle)}</h3><div class="mini-meta"><span data-preview-value="paperId">${escapeHTML(config.paperId)}</span> · Draft response</div>
                    ${config.fields.slice(0, 2).map(f => `<div class="mini-field"><strong>${escapeHTML(f.label)}</strong><small>0 / ${f.limit} ${f.unit === "words" ? "词" : "字"}</small><div class="mini-box"></div></div>`).join("")}
                    ${config.allowAttachments ? `<div class="mini-upload">＋ 拖放 ${config.fileTypes.map(x=>x.toUpperCase()).join(" / ")} 文件</div>` : ""}
                  </div>
                </div>
                <div class="preview-footer"><span>${config.fields.length} 个回复区域</span><button class="btn primary" data-open-sim>全屏预览</button></div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>`;
  bindBuilder();
}

function renderFieldsEditor() {
  return config.fields.map((f, i) => `<div class="response-card" data-field-id="${f.id}">
    <div class="response-top"><span class="response-index">${String(i+1).padStart(2,"0")}</span><span class="response-title">${escapeHTML(f.label || "未命名回复框")}</span><div class="inline-actions"><button class="mini-btn" data-move="up" title="上移">↑</button><button class="mini-btn" data-move="down" title="下移">↓</button><button class="mini-btn delete" data-delete-field title="删除">×</button></div></div>
    <div class="response-content"><div class="form-grid">
      <div class="field full"><label>标题</label><input class="control" data-field-key="label" value="${escapeHTML(f.label)}" /></div>
      <div class="field full"><label>填写说明</label><textarea class="control" data-field-key="prompt">${escapeHTML(f.prompt)}</textarea></div>
      <div class="field"><label>计数上限</label><input class="control" data-field-key="limit" type="number" min="1" max="100000" value="${f.limit}" /></div>
      <div class="field"><label>计数方式</label><select class="control" data-field-key="unit"><option value="chars" ${f.unit === "chars" ? "selected" : ""}>字符数</option><option value="words" ${f.unit === "words" ? "selected" : ""}>词数</option></select></div>
      <div class="field full"><label class="check-chip"><input type="checkbox" data-field-key="required" ${f.required ? "checked" : ""}/><span>此回复框为必填项</span></label></div>
    </div></div>
  </div>`).join("");
}

function renderFileRules() {
  const types = ["pdf","docx","doc","tex","zip","png","jpg"];
  return `<div class="field"><span class="label">允许的文件类型</span><div class="check-row">${types.map(t => `<label class="check-chip"><input type="checkbox" data-file-type="${t}" ${config.fileTypes.includes(t) ? "checked" : ""}/><span>.${t}</span></label>`).join("")}</div></div>
    <div class="form-grid">
      <div class="field"><label>单文件上限</label><div class="unit-input"><input class="control" data-config="maxFileMB" type="number" min="1" max="500" value="${config.maxFileMB}"/><span class="unit-label">MB</span></div></div>
      <div class="field"><label>最多文件数</label><div class="unit-input"><input class="control" data-config="maxFiles" type="number" min="1" max="20" value="${config.maxFiles}"/><span class="unit-label">个</span></div></div>
      <div class="field"><label>PDF 页数上限</label><div class="unit-input"><input class="control" data-config="maxPdfPages" type="number" min="1" max="100" value="${config.maxPdfPages}"/><span class="unit-label">页</span></div><span class="hint">浏览器会尝试解析常规 PDF；特殊压缩文件将标记为待校验。</span></div>
    </div>`;
}

function bindBuilder() {
  document.querySelectorAll("[data-config]").forEach(el => el.addEventListener("input", e => {
    const key = e.target.dataset.config;
    config[key] = e.target.type === "number" ? Math.max(Number(e.target.min || 0), Number(e.target.value || 0)) : e.target.value;
    saveConfig();
    document.querySelectorAll(`[data-preview-value="${key}"]`).forEach(node => node.textContent = config[key]);
  }));
  document.querySelectorAll("[data-mode]").forEach(el => el.addEventListener("click", () => { config.mode = el.dataset.mode; if (config.mode !== "multi" && config.fields.length > 1) config.fields = [config.fields[0]]; saveConfig(); renderBuilder(); }));
  document.querySelector("#attachment-switch").addEventListener("click", () => { config.allowAttachments = !config.allowAttachments; saveConfig(); renderBuilder(); });
  document.querySelectorAll("[data-file-type]").forEach(el => el.addEventListener("change", () => { config.fileTypes = [...document.querySelectorAll("[data-file-type]:checked")].map(x => x.dataset.fileType); saveConfig(); renderBuilder(); }));
  document.querySelectorAll(".response-card").forEach(card => {
    const id = card.dataset.fieldId;
    card.querySelectorAll("[data-field-key]").forEach(el => el.addEventListener("input", e => {
      const f = config.fields.find(x => x.id === id); const key = e.target.dataset.fieldKey;
      f[key] = e.target.type === "checkbox" ? e.target.checked : e.target.type === "number" ? Number(e.target.value || 0) : e.target.value;
      saveConfig();
      if (key === "label") card.querySelector(".response-title").textContent = f.label || "未命名回复框";
    }));
    card.querySelector("[data-delete-field]").addEventListener("click", () => { if (config.fields.length === 1) return toast("至少保留一个回复框"); config.fields = config.fields.filter(f => f.id !== id); saveConfig(); renderBuilder(); });
    card.querySelectorAll("[data-move]").forEach(btn => btn.addEventListener("click", () => { const at = config.fields.findIndex(f => f.id === id); const to = btn.dataset.move === "up" ? at - 1 : at + 1; if (to < 0 || to >= config.fields.length) return; [config.fields[at], config.fields[to]] = [config.fields[to], config.fields[at]]; saveConfig(); renderBuilder(); }));
  });
  document.querySelector("#add-field")?.addEventListener("click", () => { config.fields.push({ id: crypto.randomUUID(), label: `Response ${config.fields.length + 1}`, prompt: "请输入这一区域的填写说明。", limit: 2000, unit: "chars", required: true }); saveConfig(); renderBuilder(); });
  document.querySelectorAll("[data-preset]").forEach(el => el.addEventListener("click", () => { config = presets[el.dataset.preset](); saveConfig(); renderBuilder(); toast("模板已应用"); }));
  document.querySelectorAll("[data-open-sim]").forEach(el => el.addEventListener("click", openSimulator));
  document.querySelector("#save-btn").addEventListener("click", () => saveConfig(true));
  document.querySelector("#export-btn").addEventListener("click", exportConfig);
  document.querySelector("#import-btn").addEventListener("click", () => document.querySelector("#import-input").click());
  document.querySelectorAll("[data-scroll]").forEach(el => el.addEventListener("click", () => document.querySelector(`#${el.dataset.scroll}`).scrollIntoView()));
}

function modeName(mode) { return ({ single: "Single response", multi: "Multi-response", conversation: "Discussion" })[mode]; }

function openSimulator() {
  saveConfig(); route = "simulate"; location.hash = "simulate"; window.scrollTo(0,0); render();
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `rebuttal-plan-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); toast("方案文件已导出");
}

document.querySelector("#import-input").addEventListener("change", async e => {
  const file = e.target.files[0]; if (!file) return;
  try { config = normalizeConfig(JSON.parse(await file.text())); saveConfig(); route = "builder"; location.hash = ""; render(); toast("方案导入成功"); }
  catch { toast("无法读取该方案文件"); }
  e.target.value = "";
});

function renderSimulator() {
  const deadline = formatDeadline(config.deadline);
  const fields = activeFields();
  document.querySelector("#app").innerHTML = `<div class="sim-shell">
    <header class="sim-header"><div class="sim-logo">${escapeHTML(config.venue)}<small>无需登录 · Author response simulation</small></div><div class="sim-actions"><button class="btn" id="clear-draft">清空草稿</button><button class="btn" id="back-builder">← 返回配置器</button></div></header>
    <main class="sim-body">
      <div class="sim-main">
        <section class="paper-header"><div style="display:flex;justify-content:space-between;gap:15px;align-items:start"><div><span class="eyebrow">${escapeHTML(config.paperId)}</span><h1>${escapeHTML(config.paperTitle)}</h1></div><span class="status-badge">Response open</span></div><div class="meta-row"><span>${modeName(config.mode)}</span><span>·</span><span>${config.fields.length} 个回复区域</span>${config.allowAttachments ? `<span>·</span><span>允许附件</span>` : ""}</div><div class="notice">${escapeHTML(config.instructions)}</div></section>
        ${config.mode === "conversation" ? renderThread() : ""}
        ${fields.map((f,i) => renderReply(f,i)).join("")}
        ${config.allowAttachments ? renderUpload() : ""}
      </div>
      <aside class="sim-side">
        <section class="side-card"><h3>提交截止</h3><div class="deadline">${deadline.date}<small>${deadline.time}</small></div></section>
        <section class="side-card"><h3>提交检查</h3><div class="checklist" id="checklist"></div></section>
        <section class="side-card"><h3>规则摘要</h3><div class="checklist"><div class="check-item"><span class="check-icon">#</span><span>${fields.map(f => `${escapeHTML(f.label)}：${f.limit}${f.unit === "words" ? "词" : "字符"}`).join("<br>")}</span></div>${config.allowAttachments ? `<div class="check-item"><span class="check-icon">↑</span><span>${config.fileTypes.map(x=>x.toUpperCase()).join(" / ")}<br>单文件 ≤ ${config.maxFileMB} MB，最多 ${config.maxFiles} 个${config.fileTypes.includes("pdf") ? `<br>PDF ≤ ${config.maxPdfPages} 页` : ""}</span></div>` : ""}</div></section>
      </aside>
    </main>
    <footer class="submit-bar"><div class="submit-inner"><div class="submit-copy"><strong id="draft-state">草稿已自动保存</strong>这是模拟环境，不会提交到真实会议系统。</div><button class="btn primary" id="submit-sim">检查并模拟提交 ${icons.arrow}</button></div></footer>
  </div>`;
  bindSimulator(); updateValidation();
}

function renderThread() {
  return `<section class="thread"><div class="message reviewer"><div class="message-meta">Reviewer · Round 1 of ${config.rounds}</div>感谢作者的澄清。请进一步解释主要结论是否依赖特定实验设置，并说明补充实验的预期影响。</div>${simDraft.thread ? `<div class="message author"><div class="message-meta">Author · saved draft</div>${escapeHTML(simDraft.thread)}</div>` : ""}</section>`;
}

function renderReply(f, i) {
  const value = config.mode === "conversation" ? (simDraft.threadReply || "") : (simDraft[f.id] || "");
  return `<section class="reply-panel"><div class="reply-head"><div><div class="reply-number">${config.mode === "conversation" ? `Discussion · Round 1 / ${config.rounds}` : `Response ${String(i+1).padStart(2,"0")}`}</div><h2>${escapeHTML(f.label)} ${f.required ? `<span class="required" title="必填">*</span>` : ""}</h2></div><span class="limit-badge">上限 ${f.limit} ${f.unit === "words" ? "词" : "字符"}</span></div><div class="reply-body"><p class="reply-instructions">${escapeHTML(f.prompt)}</p><textarea class="control reply-textarea" data-reply-id="${f.id}" data-unit="${f.unit}" data-limit="${f.limit}" placeholder="在此输入回复…">${escapeHTML(value)}</textarea><div class="counter-row"><span>支持纯文本与基础 Markdown</span><span data-counter="${f.id}">0 / ${f.limit}</span></div><div class="progress"><span data-progress="${f.id}"></span></div></div></section>`;
}

function renderUpload() {
  return `<section class="reply-panel"><div class="reply-head"><div><div class="reply-number">Attachments</div><h2>上传补充材料</h2></div><span class="limit-badge">最多 ${config.maxFiles} 个</span></div><div class="reply-body"><div class="upload-zone" id="drop-zone"><div class="upload-icon">↑</div><strong>拖放文件到这里，或选择文件</strong><p>${config.fileTypes.map(x=>`.${x}`).join("、")} · 单文件不超过 ${config.maxFileMB} MB</p><button class="btn" id="choose-files">选择文件</button><input id="file-input" type="file" multiple accept="${config.fileTypes.map(x=>`.${x}`).join(",")}" hidden/><div class="file-list" id="file-list">${renderFiles()}</div></div></div></section>`;
}

function renderFiles() {
  return selectedFiles.map((f,i) => `<div class="file-row"><span class="file-type">${escapeHTML(f.ext)}</span><div class="file-info"><strong>${escapeHTML(f.name)}</strong><small class="${f.errors.length ? "file-error" : ""}">${f.errors.length ? escapeHTML(f.errors.join("；")) : `${formatBytes(f.size)}${f.pages ? ` · ${f.pages} 页` : f.pendingPages ? " · 页数待最终校验" : ""}`}</small></div><button class="remove-file" data-remove-file="${i}" aria-label="移除文件">×</button></div>`).join("");
}

function bindSimulator() {
  document.querySelector("#back-builder").addEventListener("click", () => { route = "builder"; history.pushState(null,"", location.pathname + location.search); render(); window.scrollTo(0,0); });
  document.querySelector("#clear-draft").addEventListener("click", () => { simDraft = {}; selectedFiles = []; localStorage.removeItem(DRAFT_KEY); renderSimulator(); toast("草稿已清空"); });
  document.querySelectorAll("[data-reply-id]").forEach(el => {
    el.addEventListener("input", e => { const key = config.mode === "conversation" ? "threadReply" : e.target.dataset.replyId; simDraft[key] = e.target.value; saveDraft(); updateCounter(e.target); updateValidation(); });
    updateCounter(el);
  });
  if (config.allowAttachments) {
    document.querySelector("#choose-files").addEventListener("click", () => document.querySelector("#file-input").click());
    document.querySelector("#file-input").addEventListener("change", e => addFiles([...e.target.files]));
    const zone = document.querySelector("#drop-zone");
    ["dragenter","dragover"].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.add("drag"); }));
    ["dragleave","drop"].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.remove("drag"); }));
    zone.addEventListener("drop", e => addFiles([...e.dataTransfer.files]));
    bindRemoveFiles();
  }
  document.querySelector("#submit-sim").addEventListener("click", submitSimulation);
}

function countValue(text, unit) {
  if (unit === "words") return (text.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
  return [...text].length;
}

function updateCounter(el) {
  const n = countValue(el.value, el.dataset.unit); const limit = Number(el.dataset.limit); const ratio = n / limit;
  const counter = document.querySelector(`[data-counter="${el.dataset.replyId}"]`); const bar = document.querySelector(`[data-progress="${el.dataset.replyId}"]`);
  counter.textContent = `${n} / ${limit}`; counter.className = ratio > 1 ? "over" : ratio >= .9 ? "near" : "";
  bar.style.width = `${Math.min(100, ratio*100)}%`; bar.className = ratio > 1 ? "over" : ratio >= .9 ? "near" : "";
}

function getValidation() {
  const fieldResults = activeFields().map(f => {
    const value = config.mode === "conversation" ? (simDraft.threadReply || "") : (simDraft[f.id] || ""); const n = countValue(value, f.unit);
    return { label: f.label, ok: (!f.required || value.trim()) && n <= f.limit, empty: f.required && !value.trim(), over: n > f.limit };
  });
  const validFiles = selectedFiles.every(f => !f.errors.length);
  return { fieldResults, validFiles, fileCount: selectedFiles.length <= config.maxFiles, ok: fieldResults.every(x=>x.ok) && validFiles && selectedFiles.length <= config.maxFiles };
}

function activeFields() {
  return config.mode === "conversation" ? config.fields.slice(0, 1) : config.fields;
}

function updateValidation() {
  const v = getValidation(); const list = document.querySelector("#checklist"); if (!list) return;
  const items = v.fieldResults.map(x => ({ok:x.ok, text: x.empty ? `${x.label} 尚未填写` : x.over ? `${x.label} 已超过上限` : `${x.label} 符合要求`}));
  if (config.allowAttachments) items.push({ok:v.validFiles && v.fileCount, text: !v.fileCount ? "附件数量超过上限" : !v.validFiles ? "附件存在格式或大小问题" : selectedFiles.length ? `${selectedFiles.length} 个附件符合要求` : "附件可选，暂未上传"});
  list.innerHTML = items.map(x => `<div class="check-item ${x.ok ? "ok" : "bad"}"><span class="check-icon">${x.ok ? "✓" : "!"}</span><span>${escapeHTML(x.text)}</span></div>`).join("");
}

async function addFiles(files) {
  for (const file of files) {
    const ext = file.name.split(".").pop().toLowerCase(); const errors = [];
    if (!config.fileTypes.includes(ext)) errors.push(`不接受 .${ext} 格式`);
    if (file.size > config.maxFileMB * 1024 * 1024) errors.push(`超过 ${config.maxFileMB} MB`);
    const record = { name:file.name, size:file.size, ext, errors, pages:null, pendingPages:false };
    if (ext === "pdf" && !errors.length) {
      try { const text = new TextDecoder("latin1").decode(await file.arrayBuffer()); const pages = (text.match(/\/Type\s*\/Page\b/g) || []).length; if (pages) { record.pages = pages; if (pages > config.maxPdfPages) errors.push(`PDF 共 ${pages} 页，超过 ${config.maxPdfPages} 页`); } else record.pendingPages = true; }
      catch { record.pendingPages = true; }
    }
    selectedFiles.push(record);
  }
  document.querySelector("#file-list").innerHTML = renderFiles(); bindRemoveFiles(); updateValidation();
}

function bindRemoveFiles() { document.querySelectorAll("[data-remove-file]").forEach(el => el.addEventListener("click", () => { selectedFiles.splice(Number(el.dataset.removeFile),1); document.querySelector("#file-list").innerHTML = renderFiles(); bindRemoveFiles(); updateValidation(); })); }

function submitSimulation() {
  const validation = getValidation();
  if (!validation.ok) { toast("请先修正红色检查项"); document.querySelector(".check-item.bad")?.scrollIntoView({ behavior:"smooth", block:"center" }); return; }
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="success-modal"><div class="modal"><div class="modal-icon">✓</div><h2>模拟提交成功</h2><p>所有回复与附件均通过当前方案的规则检查。此操作没有向任何真实会议系统发送数据，你可以下载一份模拟提交回执。</p><div class="modal-actions"><button class="btn" id="close-modal">继续编辑</button><button class="btn primary" id="download-receipt">下载回执</button></div></div></div>`);
  document.querySelector("#close-modal").addEventListener("click", () => document.querySelector("#success-modal").remove());
  document.querySelector("#download-receipt").addEventListener("click", () => { const receipt = { simulatedAt:new Date().toISOString(), scheme:config.title, paperId:config.paperId, responses:simDraft, files:selectedFiles.map(({name,size,ext,pages})=>({name,size,ext,pages})), status:"validated_simulation" }; const blob = new Blob([JSON.stringify(receipt,null,2)],{type:"application/json"}); const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rebuttal-simulation-receipt.json";a.click();URL.revokeObjectURL(a.href); });
}

function formatBytes(bytes) { return bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(2)} MB`; }
function formatDeadline(value) { const d = new Date(value); if (Number.isNaN(d.getTime())) return {date:"未设置",time:"请联系管理员"}; return {date:d.toLocaleDateString("zh-CN",{month:"short",day:"numeric"}), time:`${d.toLocaleString("zh-CN",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})} · 本地时间`}; }

window.addEventListener("hashchange", () => { route = location.hash === "#simulate" ? "simulate" : "builder"; render(); });
render();
