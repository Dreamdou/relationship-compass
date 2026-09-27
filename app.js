(() => {
  "use strict";

  const CONFIG = {
    questionsPerPage: 5,
    storageKey: "relationship-compass-v1",
  };

  const SCALE = [
    [1, "非常不符合"],
    [2, "比较不符合"],
    [3, "不确定 / 看情况"],
    [4, "比较符合"],
    [5, "非常符合"],
  ];

  const DIMENSIONS = {
    D: ["引导与承担", "你较愿意提出方向、承担决策，并为过程负责。"],
    S: ["跟随与交付", "在信任充分时，你较能把部分控制权交给对方。"],
    X: ["角色切换", "你对固定位置的依赖较低，更看重情境与搭档。"],
    ST: ["结构与仪式", "清晰规则、流程与角色约定会增强你的安全感和投入。"],
    SV: ["服务与贡献", "通过实际行动支持对方，容易让你感到关系有价值。"],
    CG: ["照护型引导", "你倾向把关心、保护和有边界的带领结合起来。"],
    CR: ["被照护空间", "被稳稳接住、允许暂时放下责任，对你有吸引力。"],
    BR: ["调皮挑战", "你可能用玩笑、试探或轻微对抗来创造互动张力。"],
    BT: ["回应挑战", "你愿意接住对方的挑战，并用一致、明确的方式回应。"],
    TG: ["感官给予", "你对设计和给予丰富体验较有兴趣。"],
    TR: ["感官接受", "在安全和协商充分时，你愿意体验更强的感官输入。"],
    BD: ["限制与约束", "明确的限制、规则或行动边界可能帮助你进入状态。"],
    PV: ["心理与语言互动", "语言、氛围和心理张力对你的体验影响较大。"],
    PET: ["宠物角色扮演", "非日常角色和象征性身份可能带给你放松或趣味。"],
    AC: ["事后照护", "结束后的安抚、确认和复盘对你尤其重要。"],
    NV: ["新奇与探索", "你对新形式保持好奇，但仍需要合适节奏与边界。"],
    TP: ["信任建立节奏", "你对建立信任所需的速度和证据有自己的偏好。"],
    CD: ["沟通直接度", "你更偏好把需求、顾虑和界限清楚说出来。"],
    EA: ["情绪觉察表达", "你较能辨认自己的感受，并尝试让对方理解。"],
    CF: ["冲突修复", "出现分歧后，你看重问题被处理以及关系被修复。"],
    AU: ["自主与空间", "保留个人时间、选择权和独立空间对你很重要。"],
    RS: ["确认与回应", "稳定回应、明确在乎与可预期联系能增强你的安全感。"],
    PB: ["隐私边界", "你重视信息由谁知道、以何种方式保存和分享。"],
    EX: ["排他与透明", "你希望关系结构和与他人的互动规则足够透明。"],
    PS: ["计划与弹性", "你会在事先规划和临场调整之间寻找自己的平衡。"],
    RF: ["复盘与调整", "你愿意从经历中总结，并据此修改下一次的约定。"],
  };

  const TYPE_PARTS = {
    role: {
      L: ["引导", "你更常主动提出方向并承担过程责任。"],
      F: ["跟随", "在信任和边界充分时，你更容易进入跟随与交付状态。"],
      X: ["切换", "你能依据关系、情境和当下状态灵活变化位置。"],
      C: ["协作", "你不急于固定角色，更偏好共同商量与共同推进。"],
    },
    structure: {
      S: ["结构", "清晰的规则和流程能让你更安心、更投入。"],
      O: ["开放", "你更重视探索空间与新鲜感，不喜欢规则过密。"],
      A: ["适应", "你会根据对象和情境，在规则与自由之间调整。"],
    },
    tone: {
      P: ["游戏", "轻松试探、玩笑与互动张力是你的重要语言。"],
      G: ["照护", "被照顾、照顾对方和事后连接是你的重要主题。"],
      B: ["平衡", "你对不同互动氛围的接受度相对均衡。"],
    },
    connection: {
      B: ["联结", "稳定回应与情感确认会明显影响你的安全感。"],
      I: ["独立", "你需要较多自主空间，并倾向自己消化一部分感受。"],
      M: ["混合", "你既需要联结，也需要独立恢复空间。"],
    },
  };

  const questions = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  let state = loadState();
  let currentPage = 0;

  const $ = (selector) => document.querySelector(selector);
  const views = [$("#welcome-view"), $("#quiz-view"), $("#contact-view"), $("#result-view")];
  const totalPages = Math.ceil(questions.length / CONFIG.questionsPerPage);

  if (questions.length !== 104) {
    document.body.innerHTML = "<main class='view'><h1>题库载入失败</h1><p>请确认 questions.js 与网页位于同一目录。</p></main>";
    return;
  }

  setupWelcome();
  setupQuiz();
  setupContact();
  setupResults();

  function defaultState() {
    return { answers: {}, completed: false, completedAt: null };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
      return saved && saved.answers ? saved : defaultState();
    } catch (_error) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  }

  function setupWelcome() {
    const consent = $("#consent");
    const start = $("#start-button");
    const resume = $("#resume-button");
    const backendReady = Boolean(window.Backend?.configured());
    const updateStart = () => { start.disabled = !consent.checked || !backendReady; };
    consent.addEventListener("change", updateStart);
    updateStart();
    if (!backendReady) {
      const status = $("#backend-status");
      status.classList.add("setup-warning");
      status.textContent = "问卷收集后台尚未连接，发起者完成配置后即可开放填写。";
    }
    start.addEventListener("click", () => {
      if (state.completed) state = defaultState();
      currentPage = 0;
      showQuiz();
    });
    const count = Object.keys(state.answers).length;
    if (count > 0 && !state.completed) {
      resume.classList.remove("hidden");
      resume.textContent = `继续上次进度（已答 ${count} 题）`;
      resume.addEventListener("click", () => {
        currentPage = firstIncompletePage();
        showQuiz();
      });
    }
    if (state.completed && count === questions.length) {
      resume.classList.remove("hidden");
      resume.textContent = "查看上次测评结果";
      resume.addEventListener("click", showResults);
    }
  }

  function setupQuiz() {
    $("#question-form").addEventListener("submit", (event) => {
      event.preventDefault();
      if (!pageIsComplete()) {
        $("#form-error").classList.remove("hidden");
        const firstMissing = Array.from(document.querySelectorAll(".question-card"))
          .find((card) => !card.querySelector("input:checked"));
        if (firstMissing) firstMissing.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      $("#form-error").classList.add("hidden");
      if (currentPage < totalPages - 1) {
        currentPage += 1;
        renderPage();
      } else {
        finishQuiz();
      }
    });
    $("#prev-button").addEventListener("click", () => {
      if (currentPage > 0) {
        currentPage -= 1;
        renderPage();
      }
    });
    $("#save-exit-button").addEventListener("click", () => {
      saveState();
      showView("welcome-view");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.location.reload();
    });
  }

  function setupContact() {
    $("#contact-back-button").addEventListener("click", () => {
      currentPage = totalPages - 1;
      showQuiz();
    });
    $("#contact-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const kind = $("#contact-kind").value;
      const value = $("#contact-value").value.trim();
      const consent = $("#collection-consent").checked;
      const error = $("#submit-error");
      if (!kind || value.length < 3 || !consent) {
        error.textContent = "请选择接收方式、填写有效联系方式，并确认数据使用说明。";
        error.classList.remove("hidden");
        return;
      }

      const button = $("#submit-response-button");
      button.disabled = true;
      button.textContent = "正在保密提交…";
      error.classList.add("hidden");
      try {
        const completedAt = new Date().toISOString();
        const response = await window.Backend.submitResponse({
          displayName: $("#display-name").value.trim(),
          contactKind: kind,
          contactValue: value,
          answers: state.answers,
          result: calculateResult(),
          completedAt,
        });
        state.completed = true;
        state.completedAt = completedAt;
        state.responseId = response?.id || null;
        saveState();
        showResults();
      } catch (submitError) {
        error.textContent = `提交未成功：${submitError.message}。答案仍保留在当前设备，请稍后重试或联系问卷发起者。`;
        error.classList.remove("hidden");
      } finally {
        button.disabled = false;
        button.textContent = "保密提交并查看反馈";
      }
    });
  }

  function setupResults() {
    $("#copy-result-button").addEventListener("click", async () => {
      const result = calculateResult();
      const text = formatResultText(result);
      try {
        await navigator.clipboard.writeText(text);
        temporaryButtonText($("#copy-result-button"), "已复制");
      } catch (_error) {
        window.prompt("请复制以下结果：", text);
      }
    });
    $("#download-result-button").addEventListener("click", () => {
      const result = calculateResult();
      const payload = {
        schema: "relationship-compass-v1",
        completedAt: state.completedAt,
        typeCode: result.code,
        typeName: result.name,
        scores: result.scores,
        answers: state.answers,
        notice: "自我探索结果，不构成医疗、心理或关系诊断。",
      };
      downloadJson(`关系罗盘_${result.code}.json`, payload);
    });
    $("#restart-button").addEventListener("click", () => {
      if (!window.confirm("确定清除当前设备上的全部答案并重新开始吗？")) return;
      localStorage.removeItem(CONFIG.storageKey);
      window.location.reload();
    });
  }

  function showQuiz() {
    showView("quiz-view");
    renderPage();
  }

  function renderPage() {
    const startIndex = currentPage * CONFIG.questionsPerPage;
    const pageQuestions = questions.slice(startIndex, startIndex + CONFIG.questionsPerPage);
    const container = $("#questions-container");
    container.innerHTML = "";
    pageQuestions.forEach((question, pageIndex) => {
      const globalIndex = startIndex + pageIndex;
      const card = document.createElement("fieldset");
      card.className = "question-card";
      const legend = document.createElement("legend");
      legend.innerHTML = `<span class="question-number">第 ${globalIndex + 1} 题</span><span class="question-text">${escapeHtml(question.text)}</span>`;
      card.appendChild(legend);
      const scale = document.createElement("div");
      scale.className = "scale";
      SCALE.forEach(([value, label]) => {
        const option = document.createElement("label");
        option.className = "scale-option";
        const checked = Number(state.answers[question.id]) === value ? " checked" : "";
        option.innerHTML = `<input type="radio" name="${question.id}" value="${value}"${checked}><span>${label}</span>`;
        option.querySelector("input").addEventListener("change", (event) => {
          state.answers[question.id] = Number(event.target.value);
          saveState();
          updateProgress();
          $("#form-error").classList.add("hidden");
        });
        scale.appendChild(option);
      });
      card.appendChild(scale);
      container.appendChild(card);
    });
    $("#prev-button").disabled = currentPage === 0;
    $("#next-button").textContent = currentPage === totalPages - 1 ? "生成我的报告" : "下一页";
    $("#progress-label").textContent = `第 ${currentPage + 1} / ${totalPages} 页`;
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateProgress() {
    const count = Object.keys(state.answers).length;
    const percent = Math.round((count / questions.length) * 100);
    $("#answer-count").textContent = `已答 ${count} / ${questions.length}`;
    $("#progress-bar").style.width = `${percent}%`;
    const track = $(".progress-track");
    track.setAttribute("aria-valuenow", String(percent));
  }

  function pageIsComplete() {
    const start = currentPage * CONFIG.questionsPerPage;
    return questions.slice(start, start + CONFIG.questionsPerPage).every((q) => state.answers[q.id]);
  }

  function firstIncompletePage() {
    const index = questions.findIndex((q) => !state.answers[q.id]);
    return index === -1 ? 0 : Math.floor(index / CONFIG.questionsPerPage);
  }

  function finishQuiz() {
    if (Object.keys(state.answers).length !== questions.length) {
      currentPage = firstIncompletePage();
      renderPage();
      return;
    }
    saveState();
    showView("contact-view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function calculateResult() {
    const buckets = {};
    questions.forEach((question) => {
      const raw = Number(state.answers[question.id]);
      const scored = question.reverse ? 6 - raw : raw;
      if (!buckets[question.dimension]) buckets[question.dimension] = [];
      buckets[question.dimension].push(scored);
    });
    const scores = {};
    Object.entries(buckets).forEach(([dimension, values]) => {
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      scores[dimension] = Math.round((average - 1) * 25);
    });

    const role = scores.D - scores.S >= 15 ? "L"
      : scores.S - scores.D >= 15 ? "F"
      : scores.X >= 65 || (Math.abs(scores.D - scores.S) < 15 && Math.max(scores.D, scores.S) >= 50) ? "X" : "C";
    const structure = scores.ST >= 65 ? "S" : scores.NV >= 65 && scores.ST < 55 ? "O" : "A";
    const playful = average(scores.BR, scores.BT);
    const caring = average(scores.CG, scores.CR, scores.AC);
    const tone = playful >= 65 && playful > caring ? "P" : caring >= 65 ? "G" : "B";
    const connected = average(scores.RS, scores.AC);
    const connection = connected >= 65 && scores.AU < 65 ? "B" : scores.AU >= 70 && scores.RS < 55 ? "I" : "M";
    const code = `${role}${structure}${tone}${connection}`;
    const parts = [
      TYPE_PARTS.role[role], TYPE_PARTS.structure[structure], TYPE_PARTS.tone[tone], TYPE_PARTS.connection[connection],
    ];
    return {
      code,
      name: parts.map((part) => part[0]).join(" · "),
      summary: parts.map((part) => part[1]).join(" "),
      scores,
      top: Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }

  function showResults() {
    const result = calculateResult();
    $("#type-code").textContent = result.code;
    $("#result-title").textContent = result.name;
    $("#result-summary").textContent = result.summary;
    renderScoreBars(result.top);
    renderInsights(result);
    showView("result-view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderScoreBars(topScores) {
    const container = $("#score-bars");
    container.innerHTML = topScores.map(([key, score]) => `
      <div class="score-row">
        <div class="score-row-top"><span>${DIMENSIONS[key][0]}</span><strong>${score}</strong></div>
        <div class="score-track"><div class="score-fill" style="width:${score}%"></div></div>
      </div>`).join("");
  }

  function renderInsights(result) {
    const topThree = result.top.slice(0, 3).map(([key]) => ({
      title: DIMENSIONS[key][0],
      text: DIMENSIONS[key][1],
    }));
    const relationshipTip = result.scores.CD < 50
      ? { title: "把暗示变成可回答的问题", text: "重要需求尽量使用“我希望……你是否愿意？”的说法，并为对方保留拒绝和稍后再谈的空间。" }
      : { title: "保留你的直接，也留出确认", text: "你较能清晰表达。关键约定后再请对方复述一次，可减少双方理解不同。" };
    const repairTip = result.scores.CF < 50
      ? { title: "预先约定修复窗口", text: "分歧升级时先暂停，并约定具体恢复沟通的时间；暂停不是消失，回来处理才是完整流程。" }
      : { title: "把修复能力用在具体行为上", text: "复盘时分别说事实、感受、影响和下一次调整，避免把一次失误概括成整个人。" };
    const items = [...topThree, relationshipTip, repairTip];
    $("#insights").innerHTML = items.map((item) => `
      <div class="insight"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></div>`).join("");
  }

  function formatResultText(result) {
    const top = result.top.slice(0, 5).map(([key, score]) => `${DIMENSIONS[key][0]} ${score}`).join("、");
    return `我的关系罗盘：${result.code}｜${result.name}\n${result.summary}\n突出维度：${top}\n提示：这是自我探索结果，不构成心理或医疗诊断。`;
  }

  function showView(id) {
    views.forEach((view) => view.classList.toggle("hidden", view.id !== id));
  }

  function average(...values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    }[char]));
  }

  function temporaryButtonText(button, text) {
    const original = button.textContent;
    button.textContent = text;
    window.setTimeout(() => { button.textContent = original; }, 1600);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
})();
