/* ============================================================
   admin.js —— 后台管理面板逻辑
   职责：登录鉴权、表单编辑、通过后端接口增删改查。
   安全：登录与会话由后端校验，写操作调用鉴权接口。
   ============================================================ */

let currentConfig = null;

document.addEventListener("DOMContentLoaded", initAdmin);

async function initAdmin() {
  bindLoginForm();
  bindSave();
  bindLogout();

  // 若已有有效会话，直接进入面板
  const authed = await checkSession();
  if (authed) {
    await openPanel();
  }
}

/* ------------------------------------------------------------
   会话检查与登录
   ------------------------------------------------------------ */
async function checkSession() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.authenticated;
  } catch (e) {
    return false;
  }
}

function bindLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    if (!username || !password) {
      showMessage("请输入账号和密码", true);
      return;
    }
    const ok = await doLogin(username, password);
    if (ok) {
      await openPanel();
    }
  });
}

async function doLogin(username, password) {
  const btn = document.querySelector("#login-form button[type=submit]");
  setButtonLoading(btn, true, "登录中…");
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) return true;
    const data = await res.json().catch(() => ({}));
    showMessage(data.error || "登录失败", true);
    return false;
  } catch (e) {
    showMessage("网络错误，请重试", true);
    return false;
  } finally {
    setButtonLoading(btn, false);
  }
}

async function openPanel() {
  document.getElementById("admin-login").hidden = true;
  document.getElementById("admin-panel").hidden = false;

  try {
    currentConfig = await window.loadConfig();
  } catch (e) {
    currentConfig = window.DEFAULT_CONFIG;
  }
  normalizeConfig(currentConfig);
  buildForms(currentConfig);
}

/* ------------------------------------------------------------
   保存与退出
   ------------------------------------------------------------ */
function bindSave() {
  const btn = document.getElementById("btn-save");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!validateForm()) return;
    setButtonLoading(btn, true, "保存中…");
    const ok = await saveConfig(currentConfig);
    setButtonLoading(btn, false);
    if (ok) {
      showMessage("保存成功", false);
      await refreshConfig();  // 保存后自动刷新表单数据，无需手动刷新页面
    }
  });
}

/* 保存成功后重新拉取配置并重建表单，展示服务端最新数据 */
async function refreshConfig() {
  try {
    const fresh = await window.loadConfig();
    if (fresh) {
      currentConfig = fresh;
      normalizeConfig(currentConfig);
      buildForms(currentConfig);
    }
  } catch (e) {
    // 拉取失败则保留当前表单，不打断用户
  }
}

/* 按钮加载态：置灰 + 文案替换，完成后恢复 */
function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn._origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = text || "处理中…";
  } else {
    btn.disabled = false;
    if (btn._origText) btn.textContent = btn._origText;
  }
}

async function saveConfig(config) {
  try {
    const res = await fetch("/api/config", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (res.ok) return true;
    const data = await res.json().catch(() => ({}));
    showMessage(data.error || "保存失败", true);
    return false;
  } catch (e) {
    showMessage("网络错误，保存失败", true);
    return false;
  }
}

function bindLogout() {
  const btn = document.getElementById("btn-logout");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch (e) {
      // 忽略
    }
    location.reload();
  });
}

/* ------------------------------------------------------------
   表单生成：个人信息 / 联系方式 / 简历 / 项目
   ------------------------------------------------------------ */
function buildForms(config) {
  buildProfileForm(config);
  buildContactForm(config);
  buildResumeForm(config);
  buildProjectsForm(config);
}

function buildProfileForm(config) {
  const sec = document.getElementById("admin-profile");
  sec.replaceChildren();
  sec.appendChild(el("h2", "admin-section-title", "个人信息"));
  const p = config.profile;
  sec.appendChild(field("姓名", bindInput(textInput(p.name), p, "name")));
  sec.appendChild(field("岗位 / 一句话简介", bindInput(textInput(p.title), p, "title")));
  sec.appendChild(field("头像地址", bindInput(textInput(p.avatarUrl), p, "avatarUrl")));
  sec.appendChild(field("头像背面文字", bindInput(textInput(p.avatarBackText), p, "avatarBackText")));
  sec.appendChild(field("个人简介", bindInput(textArea(p.bio), p, "bio")));
}

function buildContactForm(config) {
  const sec = document.getElementById("admin-contact");
  sec.replaceChildren();
  sec.appendChild(el("h2", "admin-section-title", "联系方式"));
  const c = config.contact;
  sec.appendChild(field("邮箱（Base64 编码）", bindInput(textInput(c.emailBase64, "例如：dGVzdEBleGFtcGxlLmNvbQ=="), c, "emailBase64")));
  sec.appendChild(field("GitHub 地址", bindInput(textInput(c.githubUrl, "https://github.com/xxx"), c, "githubUrl")));
  sec.appendChild(field("博客地址（可选）", bindInput(textInput(c.blogUrl), c, "blogUrl")));

  sec.appendChild(el("h3", "admin-subtitle", "其他社交链接"));
  const list = el("div", "admin-list");
  sec.appendChild(list);
  sec.appendChild(addButton("+ 添加链接", () => {
    c.links.push(emptyLink());
    renderLinks(list, c);
  }));
  renderLinks(list, c);
}

function renderLinks(list, contact) {
  list.replaceChildren();
  if (!contact.links.length) {
    list.appendChild(el("p", "empty-hint", "（暂无，可点击“添加链接”）"));
    return;
  }
  contact.links.forEach((link, i) => {
    const wrap = el("div", "admin-list-item");
    wrap.appendChild(field("名称", bindInput(textInput(link.label), link, "label")));
    wrap.appendChild(field("地址", bindInput(textInput(link.url), link, "url")));
    wrap.appendChild(delButton(() => {
      contact.links.splice(i, 1);
      renderLinks(list, contact);
    }));
    list.appendChild(wrap);
  });
}

function buildResumeForm(config) {
  const sec = document.getElementById("admin-resume");
  sec.replaceChildren();
  sec.appendChild(el("h2", "admin-section-title", "简历内容"));
  const r = config.resume;

  sec.appendChild(field("个人总结", bindInput(textArea(r.summary), r, "summary")));

  sec.appendChild(el("h3", "admin-subtitle", "教育经历"));
  const eduList = el("div", "admin-list");
  sec.appendChild(eduList);
  sec.appendChild(addButton("+ 添加教育经历", () => {
    r.education.push(emptyEducation());
    renderEducationList(eduList, r);
  }));
  renderEducationList(eduList, r);

  sec.appendChild(el("h3", "admin-subtitle", "工作经历"));
  const expList = el("div", "admin-list");
  sec.appendChild(expList);
  sec.appendChild(addButton("+ 添加工作经历", () => {
    r.experience.push(emptyExperience());
    renderExperienceList(expList, r);
  }));
  renderExperienceList(expList, r);

  sec.appendChild(el("h3", "admin-subtitle", "技能"));
  const skillList = el("div", "admin-list");
  sec.appendChild(skillList);
  sec.appendChild(addButton("+ 添加技能分类", () => {
    r.skills.push(emptySkill());
    renderSkillList(skillList, r);
  }));
  renderSkillList(skillList, r);
}

function renderEducationList(list, resume) {
  list.replaceChildren();
  if (!resume.education.length) {
    list.appendChild(el("p", "empty-hint", "（暂无）"));
    return;
  }
  resume.education.forEach((item, i) => {
    const wrap = el("div", "admin-list-item");
    wrap.appendChild(field("学校", bindInput(textInput(item.school), item, "school")));
    wrap.appendChild(field("专业", bindInput(textInput(item.major), item, "major")));
    wrap.appendChild(field("学历", bindInput(textInput(item.degree), item, "degree")));
    wrap.appendChild(field("起止时间", bindInput(textInput(item.period), item, "period")));
    wrap.appendChild(field("描述", bindInput(textArea(item.description), item, "description")));
    wrap.appendChild(delButton(() => {
      resume.education.splice(i, 1);
      renderEducationList(list, resume);
    }));
    list.appendChild(wrap);
  });
}

function renderExperienceList(list, resume) {
  list.replaceChildren();
  if (!resume.experience.length) {
    list.appendChild(el("p", "empty-hint", "（暂无）"));
    return;
  }
  resume.experience.forEach((item, i) => {
    const wrap = el("div", "admin-list-item");
    wrap.appendChild(field("公司 / 组织", bindInput(textInput(item.company), item, "company")));
    wrap.appendChild(field("职位 / 角色", bindInput(textInput(item.role), item, "role")));
    wrap.appendChild(field("起止时间", bindInput(textInput(item.period), item, "period")));
    wrap.appendChild(field("描述", bindInput(textArea(item.description), item, "description")));
    wrap.appendChild(delButton(() => {
      resume.experience.splice(i, 1);
      renderExperienceList(list, resume);
    }));
    list.appendChild(wrap);
  });
}

function renderSkillList(list, resume) {
  list.replaceChildren();
  if (!resume.skills.length) {
    list.appendChild(el("p", "empty-hint", "（暂无）"));
    return;
  }
  resume.skills.forEach((skill, i) => {
    const wrap = el("div", "admin-list-item");
    wrap.appendChild(field("分类", bindInput(textInput(skill.category), skill, "category")));
    wrap.appendChild(field("技能（逗号分隔）", bindArrayString(textInput(arrayToStr(skill.items)), skill, "items")));
    wrap.appendChild(delButton(() => {
      resume.skills.splice(i, 1);
      renderSkillList(list, resume);
    }));
    list.appendChild(wrap);
  });
}

function buildProjectsForm(config) {
  const sec = document.getElementById("admin-projects");
  sec.replaceChildren();
  sec.appendChild(el("h2", "admin-section-title", "项目管理"));

  const list = el("div", "admin-projects");
  sec.appendChild(list);
  sec.appendChild(addButton("+ 添加项目", () => {
    config.projects.push(emptyProject());
    renderProjects(list, config);
  }));
  renderProjects(list, config);
}

function renderProjects(list, config) {
  list.replaceChildren();
  if (!config.projects.length) {
    list.appendChild(el("p", "empty-hint", "（暂无项目，点击“添加项目”新增）"));
    return;
  }
  config.projects.forEach((proj, i) => {
    const card = el("div", "admin-list-item admin-project");
    card.appendChild(el("h3", "admin-subtitle", "项目 " + (i + 1)));
    card.appendChild(field("项目名称", bindInput(textInput(proj.name), proj, "name")));
    card.appendChild(field("项目简介", bindInput(textArea(proj.description), proj, "description")));
    card.appendChild(field("技术标签（逗号分隔）", bindArrayString(textInput(arrayToStr(proj.tags), "JS, HTML, CSS"), proj, "tags")));
    card.appendChild(field("预览图地址", bindInput(textInput(proj.imageUrl), proj, "imageUrl")));
    card.appendChild(field("Demo 地址", bindInput(textInput(proj.demoUrl), proj, "demoUrl")));
    card.appendChild(field("GitHub 地址", bindInput(textInput(proj.githubUrl), proj, "githubUrl")));
    card.appendChild(delButton(() => {
      config.projects.splice(i, 1);
      renderProjects(list, config);
    }));
    list.appendChild(card);
  });
}

/* ------------------------------------------------------------
   校验与归一化
   ------------------------------------------------------------ */
function validateForm() {
  if (!currentConfig || !currentConfig.profile) {
    showMessage("配置为空，请先加载配置", true);
    return false;
  }
  if (!currentConfig.profile.name || !String(currentConfig.profile.name).trim()) {
    showMessage("请填写姓名", true);
    return false;
  }
  return true;
}

function normalizeConfig(cfg) {
  const base = window.DEFAULT_CONFIG || {};
  if (!cfg || typeof cfg !== "object") cfg = {};
  cfg.profile = Object.assign({}, base.profile, cfg.profile || {});
  cfg.contact = Object.assign({}, base.contact, cfg.contact || {});
  cfg.contact.links = Array.isArray(cfg.contact.links) ? cfg.contact.links : [];
  cfg.projects = Array.isArray(cfg.projects) ? cfg.projects : [];
  cfg.resume = Object.assign({}, base.resume, cfg.resume || {});
  cfg.resume.education = Array.isArray(cfg.resume.education) ? cfg.resume.education : [];
  cfg.resume.experience = Array.isArray(cfg.resume.experience) ? cfg.resume.experience : [];
  cfg.resume.skills = Array.isArray(cfg.resume.skills) ? cfg.resume.skills : [];
  return cfg;
}

/* ------------------------------------------------------------
   空条目模板
   ------------------------------------------------------------ */
function emptyLink() { return { label: "", url: "" }; }
function emptyEducation() { return { school: "", major: "", degree: "", period: "", description: "" }; }
function emptyExperience() { return { company: "", role: "", period: "", description: "" }; }
function emptySkill() { return { category: "", items: [] }; }
function emptyProject() {
  return { id: "proj" + Date.now(), name: "", description: "", tags: [], imageUrl: "", demoUrl: "", githubUrl: "" };
}

/* ------------------------------------------------------------
   DOM 工具函数（全部使用 textContent，禁止 innerHTML）
   ------------------------------------------------------------ */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function field(labelText, inputNode) {
  const wrap = el("label", "admin-field");
  wrap.appendChild(el("span", "admin-label", labelText));
  wrap.appendChild(inputNode);
  return wrap;
}

function textInput(value, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function textArea(value) {
  const ta = document.createElement("textarea");
  ta.rows = 3;
  ta.value = value || "";
  return ta;
}

function bindInput(input, obj, key) {
  input.addEventListener("input", () => { obj[key] = input.value; });
  return input;
}

function bindArrayString(input, obj, key) {
  input.addEventListener("input", () => {
    obj[key] = input.value.split(",").map((s) => s.trim()).filter(Boolean);
  });
  return input;
}

function arrayToStr(arr) {
  return Array.isArray(arr) ? arr.join(", ") : (arr || "");
}

function addButton(text, onClick) {
  const btn = el("button", "admin-btn admin-btn-add", text);
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
}

function delButton(onClick) {
  const btn = el("button", "admin-btn admin-btn-del", "删除");
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
}

/* ------------------------------------------------------------
   消息提示（自动消失）
   ------------------------------------------------------------ */
function showMessage(text, isError) {
  let box = document.getElementById("admin-message");
  if (!box) {
    box = document.createElement("div");
    box.id = "admin-message";
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.className = "admin-message" + (isError ? " admin-message-error" : " admin-message-ok");
  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.classList.add("admin-message-hide");
  }, 3000);
}
