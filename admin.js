(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  let session = window.Backend.getSession();
  let survey = null;
  let responses = [];

  $("#login-form").addEventListener("submit", handleLogin);
  $("#logout-button").addEventListener("click", logout);
  $("#refresh-button").addEventListener("click", loadDashboard);
  $("#export-button").addEventListener("click", exportCsv);
  $("#search-input").addEventListener("input", renderRows);
  $("#status-filter").addEventListener("change", renderRows);
  $("#copy-survey-id").addEventListener("click", copySurveyId);

  if (session) openDashboard();

  async function handleLogin(event) {
    event.preventDefault();
    const button = $("#login-button");
    const error = $("#login-error");
    button.disabled = true;
    button.textContent = "正在登录…";
    error.classList.add("hidden");
    try {
      session = await window.Backend.signIn($("#admin-email").value.trim(), $("#admin-password").value);
      await openDashboard();
    } catch (loginError) {
      error.textContent = `登录失败：${loginError.message}`;
      error.classList.remove("hidden");
    } finally {
      button.disabled = false;
      button.textContent = "登录后台";
    }
  }

  async function openDashboard() {
    $("#login-view").classList.add("hidden");
    $("#dashboard-view").classList.remove("hidden");
    $("#logout-button").classList.remove("hidden");
    try {
      survey = await window.Backend.ensureSurvey(session);
      $("#survey-meta").textContent = `${survey.title} · ${survey.slug}`;
      if (!window.Backend.config.surveyId || window.Backend.config.surveyId !== survey.id) {
        $("#setup-card").classList.remove("hidden");
        $("#survey-id-value").textContent = survey.id;
      }
      await loadDashboard();
    } catch (error) {
      showDashboardError(error.message);
    }
  }

  async function loadDashboard() {
    try {
      responses = await window.Backend.listResponses(session, survey.id);
      renderStats();
      renderRows();
      $("#dashboard-error").classList.add("hidden");
    } catch (error) {
      showDashboardError(error.message);
    }
  }

  function renderStats() {
    $("#stat-total").textContent = responses.length;
    $("#stat-pending").textContent = responses.filter((item) => item.report_status === "待发送").length;
    $("#stat-sent").textContent = responses.filter((item) => item.report_status === "已发送").length;
    $("#stat-types").textContent = new Set(responses.map((item) => item.type_code)).size;
  }

  function filteredResponses() {
    const query = $("#search-input").value.trim().toLowerCase();
    const status = $("#status-filter").value;
    return responses.filter((item) => {
      const haystack = [item.display_name, item.contact_kind, item.contact_value, item.type_code, item.type_name].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (status === "全部" || item.report_status === status);
    });
  }

  function renderRows() {
    const items = filteredResponses();
    $("#empty-state").classList.toggle("hidden", items.length > 0);
    $("#response-rows").innerHTML = items.map((item) => `
      <tr>
        <td>${formatDate(item.completed_at)}</td>
        <td>${escapeHtml(item.display_name || "未填写")}</td>
        <td>${escapeHtml(item.contact_kind)}：${escapeHtml(maskContact(item.contact_value))}</td>
        <td><strong>${escapeHtml(item.type_code)}</strong><br><small>${escapeHtml(item.type_name)}</small></td>
        <td>
          <select class="status-select" data-id="${item.id}" aria-label="修改报告状态">
            ${["待发送", "制作中", "已发送"].map((status) => `<option${status === item.report_status ? " selected" : ""}>${status}</option>`).join("")}
          </select>
        </td>
        <td><button class="table-button" data-detail="${item.id}" type="button">查看详情</button></td>
      </tr>`).join("");
    document.querySelectorAll(".status-select").forEach((select) => select.addEventListener("change", updateStatus));
    document.querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", showDetail));
  }

  async function updateStatus(event) {
    const item = responses.find((row) => row.id === event.target.dataset.id);
    const previous = item.report_status;
    item.report_status = event.target.value;
    renderStats();
    try {
      await window.Backend.updateReportStatus(session, item.id, item.report_status);
    } catch (error) {
      item.report_status = previous;
      event.target.value = previous;
      renderStats();
      showDashboardError(`状态更新失败：${error.message}`);
    }
  }

  function showDetail(event) {
    const item = responses.find((row) => row.id === event.currentTarget.dataset.detail);
    const scores = Object.entries(item.scores || {}).sort((a, b) => b[1] - a[1]);
    $("#response-detail").innerHTML = `
      <div class="detail-head"><p class="eyebrow">完整答卷</p><h2>${escapeHtml(item.type_code)} · ${escapeHtml(item.type_name)}</h2><p class="detail-meta">${formatDate(item.completed_at)}</p></div>
      <div class="detail-grid">
        <div><span>称呼</span>${escapeHtml(item.display_name || "未填写")}</div>
        <div><span>报告状态</span>${escapeHtml(item.report_status)}</div>
        <div><span>联系方式类型</span>${escapeHtml(item.contact_kind)}</div>
        <div><span>联系方式</span>${escapeHtml(item.contact_value)}</div>
      </div>
      <h3>26 个维度分数（10 分制）</h3>
      <div class="detail-scores">${scores.map(([key, value]) => `<div class="detail-score">${escapeHtml(key)}<strong>${formatScore(value)}</strong></div>`).join("")}</div>
      <details><summary>查看原始答案</summary><pre>${escapeHtml(JSON.stringify(item.answers, null, 2))}</pre></details>`;
    $("#response-dialog").showModal();
  }

  function exportCsv() {
    const headers = ["完成时间", "称呼", "联系方式类型", "联系方式", "类型代码", "类型名称", "报告状态", ...scoreKeys()];
    const rows = responses.map((item) => [
      item.completed_at, item.display_name || "", item.contact_kind, item.contact_value,
      item.type_code, item.type_name, item.report_status,
      ...scoreKeys().map((key) => item.scores?.[key] ?? ""),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `关系罗盘答卷_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function scoreKeys() {
    return ["D", "S", "X", "ST", "SV", "CG", "CR", "BR", "BT", "TG", "TR", "BD", "PV", "PET", "AC", "NV", "TP", "CD", "EA", "CF", "AU", "RS", "PB", "EX", "PS", "RF"];
  }

  function formatScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    const normalized = numeric > 10 ? numeric / 10 : numeric;
    return `${normalized.toFixed(1)} / 10`;
  }

  function copySurveyId() {
    navigator.clipboard.writeText(survey.id);
    const button = $("#copy-survey-id");
    button.textContent = "已复制";
    setTimeout(() => { button.textContent = "复制编号"; }, 1400);
  }

  function logout() {
    window.Backend.signOut();
    window.location.reload();
  }

  function showDashboardError(message) {
    $("#dashboard-error").textContent = message;
    $("#dashboard-error").classList.remove("hidden");
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }

  function maskContact(value) {
    if (!value || value.length < 5) return value;
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }
})();
