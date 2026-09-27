(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  const sessionKey = "relationship-compass-admin-session";

  function configured() {
    return Boolean(
      /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || "") &&
      (config.publishableKey || "").length > 20 &&
      /^[0-9a-f-]{36}$/i.test(config.surveyId || "")
    );
  }

  async function request(path, options = {}, accessToken = "") {
    if (!config.supabaseUrl || !config.publishableKey) throw new Error("数据后台尚未配置");
    const headers = {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(`${config.supabaseUrl}${path}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      let message = `请求失败（${response.status}）`;
      try {
        const data = await response.json();
        message = data.message || data.msg || data.error_description || data.error || message;
      } catch (_error) {}
      throw new Error(message);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function submitResponse(payload) {
    if (!configured()) throw new Error("问卷收集后台尚未完成配置，请联系问卷发起者。");
    const rows = await request("/rest/v1/responses", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        survey_id: config.surveyId,
        display_name: payload.displayName || null,
        contact_kind: payload.contactKind,
        contact_value: payload.contactValue,
        type_code: payload.result.code,
        type_name: payload.result.name,
        scores: payload.result.scores,
        answers: payload.answers,
        consent_to_collection: true,
        consent_version: "2026-09-27-v1",
        completed_at: payload.completedAt,
      }),
    });
    return rows;
  }

  async function signIn(email, password) {
    const session = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(sessionKey));
      if (!session?.access_token) return null;
      return session;
    } catch (_error) {
      return null;
    }
  }

  function signOut() {
    sessionStorage.removeItem(sessionKey);
  }

  function userIdFromToken(token) {
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(payload)))).sub;
    } catch (_error) {
      throw new Error("登录信息无效，请重新登录");
    }
  }

  async function ensureSurvey(session) {
    const slug = encodeURIComponent(config.surveySlug || "relationship-compass-v1");
    const existing = await request(`/rest/v1/surveys?select=id,slug,title,active&slug=eq.${slug}`, {
      method: "GET",
    }, session.access_token);
    if (existing?.length) return existing[0];
    const created = await request("/rest/v1/surveys", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: userIdFromToken(session.access_token),
        slug: config.surveySlug || "relationship-compass-v1",
        title: config.surveyTitle || "关系偏好与边界探索测评",
      }),
    }, session.access_token);
    return created[0];
  }

  async function listResponses(session, surveyId = config.surveyId) {
    const select = [
      "id", "display_name", "contact_kind", "contact_value", "type_code", "type_name",
      "scores", "answers", "completed_at", "created_at", "report_status", "survey_id",
    ].join(",");
    return request(`/rest/v1/responses?select=${select}&survey_id=eq.${encodeURIComponent(surveyId)}&order=created_at.desc`, {
      method: "GET",
    }, session.access_token);
  }

  async function updateReportStatus(session, responseId, status) {
    return request(`/rest/v1/responses?id=eq.${encodeURIComponent(responseId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ report_status: status }),
    }, session.access_token);
  }

  window.Backend = {
    config,
    configured,
    submitResponse,
    signIn,
    getSession,
    signOut,
    ensureSurvey,
    listResponses,
    updateReportStatus,
  };
})();
