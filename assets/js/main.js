/* ============================================================
   main.js —— 前台公共逻辑
   职责：壁纸背景、一言、导航交互、按 site-config.json 渲染页面。
   安全：所有文本一律用 textContent 渲染，禁止 innerHTML。
   ============================================================ */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  showToast("加载中…", "loading");  // 全局加载提示

  const config = await loadConfig();

  hideToast();  // 请求完成，隐藏加载提示

  // 接口异常（网络断开 / 500 / 404 等）时已降级，给出友好提示
  if (window.CONFIG_STATUS && window.CONFIG_STATUS.degraded) {
    showToast("网络异常，已展示默认内容", "info", 4000);
  }

  initNavigation();   // 导航（汉堡菜单）
  initBackground();   // 必应壁纸（注释此行即可关闭壁纸）
  route(config);      // 根据当前页面渲染内容
  renderFooter(config);

  // 一言仅在首页展示（注释此行即可关闭一言）
  if (document.getElementById("hitokoto")) {
    initHitokoto();
  }
}

/* ------------------------------------------------------------
   工具函数：创建元素，一律用 textContent 赋值，禁止 innerHTML
   ------------------------------------------------------------ */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* 创建外链 <a>，统一新窗口打开 */
function makeLink(label, href) {
  const a = document.createElement("a");
  a.className = "social-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

/* Base64 解码（仅用于邮箱，失败时返回空字符串，不抛错） */
function decodeBase64(str) {
  if (!str) return "";
  try {
    return atob(str);
  } catch (e) {
    return "";
  }
}

/* ------------------------------------------------------------
   内容有效性判断：用于决定某个信息模块是否显示。
   无有效内容时整块隐藏，不显示“暂无”占位。
   ------------------------------------------------------------ */
function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasAnyValue(obj) {
  if (!obj || typeof obj !== "object") return !!obj;
  return Object.keys(obj).some((key) => {
    const v = obj[key];
    if (Array.isArray(v)) return v.length > 0;
    return hasText(v);
  });
}

function hasEntries(list) {
  return Array.isArray(list) && list.some((item) => item && hasAnyValue(item));
}

function isValidProject(proj) {
  if (!proj) return false;
  return hasText(proj.name) || hasText(proj.description) ||
    (Array.isArray(proj.tags) && proj.tags.length > 0) ||
    hasText(proj.imageUrl) || hasText(proj.demoUrl) || hasText(proj.githubUrl);
}

/* 渲染某个分区模块：无有效内容时隐藏，有内容时显示标题与正文 */
function renderSection(id, title, hasContent, renderBody) {
  const section = document.getElementById(id);
  if (!section) return;
  section.replaceChildren();
  if (!hasContent) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  section.appendChild(el("h2", "section-title", title));
  renderBody(section);
}

/* ------------------------------------------------------------
   全局状态提示（Toast）：加载中 / 降级提示。
   请求完成后自动消失；用于全站所有页面的接口加载状态。
   ------------------------------------------------------------ */
function showToast(text, type, duration) {
  let toast = document.getElementById("site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    toast.className = "site-toast";
    document.body.appendChild(toast);
  }
  toast.replaceChildren();

  // 加载中：附带旋转指示器
  if (type === "loading") {
    const spinner = el("span", "spinner", "");
    spinner.setAttribute("aria-hidden", "true");
    toast.appendChild(spinner);
  }
  toast.appendChild(el("span", "site-toast-text", text));

  let cls = "site-toast show";
  if (type === "error") cls += " site-toast-error";
  else if (type === "info") cls += " site-toast-info";
  toast.className = cls;

  clearTimeout(toast._timer);
  if (duration) {
    toast._timer = setTimeout(hideToast, duration);
  }
}

function hideToast() {
  const toast = document.getElementById("site-toast");
  if (toast) toast.classList.remove("show");
}

/* ------------------------------------------------------------
   导航：移动端汉堡菜单开关
   ------------------------------------------------------------ */
function initNavigation() {
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* ------------------------------------------------------------
   必应壁纸：读取 window.BING_IMAGES，sessionStorage 记录索引切换
   ------------------------------------------------------------ */
function initBackground() {
  const layer = document.getElementById("bg-layer");
  const images = window.BING_IMAGES;
  if (!layer || !Array.isArray(images) || images.length === 0) return;

  let index = parseInt(sessionStorage.getItem("bingIndex"), 10);
  if (isNaN(index) || index < 0 || index >= images.length) {
    index = Math.floor(Math.random() * images.length);
  }

  layer.style.backgroundImage = 'url("' + images[index] + '")';

  // 记录下一张索引，下次刷新自动切换壁纸
  sessionStorage.setItem("bingIndex", String((index + 1) % images.length));
}

/* ------------------------------------------------------------
   一言 Hitokoto：请求公开接口，textContent 渲染，网络异常优雅降级
   ------------------------------------------------------------ */
async function initHitokoto() {
  const box = document.getElementById("hitokoto");
  if (!box) return;
  try {
    const res = await fetch("https://v1.hitokoto.cn/?c=d&c=i&encode=json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    box.textContent = data.hitokoto + (data.from ? " —— " + data.from : "");
  } catch (err) {
    // 网络异常降级：显示默认短句
    box.textContent = "「生活明朗，万物可爱」";
  }
}

/* ------------------------------------------------------------
   页面路由：根据 <main> 的 id 决定渲染哪个页面
   ------------------------------------------------------------ */
function route(config) {
  const main = document.querySelector("main");
  const page = main ? main.id : "";
  switch (page) {
    case "page-home":
      renderHome(config);
      break;
    case "page-resume":
      renderResume(config);
      break;
    case "page-contact":
      renderContact(config);
      break;
    case "page-projects":
      renderProjects(config);
      break;
    default:
      break; // 404 等页面保持静态内容
  }
}

/* ------------------------------------------------------------
   首页 Hero
   ------------------------------------------------------------ */
function renderHome(config) {
  const hero = document.getElementById("hero");
  if (!hero) return;
  hero.replaceChildren();

  const p = config.profile || {};
  const c = config.contact || {};

  // 3D 翻转头像
  const avatar = el("div", "avatar-flip");
  const inner = el("div", "avatar-inner");
  const front = el("div", "avatar-front");
  const img = document.createElement("img");
  img.src = p.avatarUrl || "";
  img.alt = p.name || "";
  // 头像失效时隐藏，避免破图
  img.addEventListener("error", () => { img.style.display = "none"; });
  front.appendChild(img);
  const back = el("div", "avatar-back", p.avatarBackText || "");
  inner.appendChild(front);
  inner.appendChild(back);
  avatar.appendChild(inner);

  const name = el("h1", "hero-name", p.name || "");
  const title = el("p", "hero-title", p.title || "");
  const bio = el("p", "hero-bio", p.bio || "");

  const hitokoto = el("p", "hitokoto", "");
  hitokoto.id = "hitokoto";

  const social = el("div", "social-links");
  social.appendChild(buildSocialLinks(c));

  hero.appendChild(avatar);
  hero.appendChild(name);
  hero.appendChild(title);
  hero.appendChild(bio);
  hero.appendChild(hitokoto);
  hero.appendChild(social);
}

/* ------------------------------------------------------------
   社交链接 + Base64 邮箱（点击解码唤起 mailto）
   ------------------------------------------------------------ */
function buildSocialLinks(contact) {
  const frag = document.createDocumentFragment();
  if (!contact) return frag;

  if (contact.githubUrl) {
    frag.appendChild(makeLink("GitHub", contact.githubUrl));
  }

  if (contact.emailBase64) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "social-link";
    btn.textContent = "邮箱";
    btn.addEventListener("click", () => {
      const decoded = decodeBase64(contact.emailBase64);
      if (decoded) window.location.href = "mailto:" + decoded;
    });
    frag.appendChild(btn);
  }

  if (contact.blogUrl) {
    frag.appendChild(makeLink("博客", contact.blogUrl));
  }

  if (Array.isArray(contact.links)) {
    contact.links.forEach((link) => {
      if (!link || !link.label) return;
      frag.appendChild(makeLink(link.label, link.url || "#"));
    });
  }

  return frag;
}

/* ------------------------------------------------------------
   简历页
   ------------------------------------------------------------ */
function renderResume(config) {
  const r = config.resume || {};

  renderSection("resume-summary", "个人总结", hasText(r.summary), (sec) => {
    sec.appendChild(el("p", "resume-text", r.summary));
  });

  renderSection("resume-education", "教育经历", hasEntries(r.education), (sec) => {
    appendResumeEntries(sec, r.education, renderEducation);
  });

  renderSection("resume-experience", "工作经历", hasEntries(r.experience), (sec) => {
    appendResumeEntries(sec, r.experience, renderExperience);
  });

  renderSection("resume-skills", "技能", hasEntries(r.skills), (sec) => {
    appendSkills(sec, r.skills);
  });
}

/* 渲染教育/工作经历列表，仅输出包含有效内容的条目 */
function appendResumeEntries(container, list, renderItem) {
  const items = (Array.isArray(list) ? list : []).filter((item) => item && hasAnyValue(item));
  items.forEach((item) => {
    container.appendChild(renderItem(item));
  });
}

function renderEducation(edu) {
  const div = el("div", "entry");
  const head = el("div", "entry-head");
  head.appendChild(el("span", "entry-title", (edu.school || "") + (edu.degree ? " · " + edu.degree : "")));
  head.appendChild(el("span", "entry-period", edu.period || ""));
  div.appendChild(head);
  if (edu.major) div.appendChild(el("div", "entry-sub", edu.major));
  if (edu.description) div.appendChild(el("div", "entry-desc", edu.description));
  return div;
}

function renderExperience(exp) {
  const div = el("div", "entry");
  const head = el("div", "entry-head");
  head.appendChild(el("span", "entry-title", exp.company || ""));
  head.appendChild(el("span", "entry-period", exp.period || ""));
  div.appendChild(head);
  if (exp.role) div.appendChild(el("div", "entry-sub", exp.role));
  if (exp.description) div.appendChild(el("div", "entry-desc", exp.description));
  return div;
}

function appendSkills(container, skills) {
  const groups = (Array.isArray(skills) ? skills : []).filter((group) => group && hasAnyValue(group));
  groups.forEach((group) => {
    const wrap = el("div", "skill-group");
    wrap.appendChild(el("div", "skill-category", group.category || ""));
    const items = Array.isArray(group.items) ? group.items.join(" / ") : "";
    wrap.appendChild(el("div", "skill-items", items));
    container.appendChild(wrap);
  });
}

/* ------------------------------------------------------------
   联系页
   ------------------------------------------------------------ */
function renderContact(config) {
  const container = document.getElementById("contact-info");
  if (!container) return;
  container.replaceChildren();

  container.appendChild(el("h1", "page-title", "联系方式"));
  const list = el("div", "contact-list");
  list.appendChild(buildSocialLinks(config.contact || {}));
  container.appendChild(list);
}

/* ------------------------------------------------------------
   项目页：渲染项目卡片列表
   ------------------------------------------------------------ */
function renderProjects(config) {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  grid.replaceChildren();

  const projects = (Array.isArray(config.projects) ? config.projects : []).filter(isValidProject);

  // 无有效项目时隐藏整个项目模块，避免显示“暂无项目”
  if (projects.length === 0) {
    grid.hidden = true;
    return;
  }
  grid.hidden = false;

  grid.appendChild(el("h1", "page-title", "项目"));
  const list = el("div", "projects-grid");
  projects.forEach((proj) => {
    list.appendChild(renderProjectCard(proj));
  });
  grid.appendChild(list);
}

/* 单个项目卡片：预览图 + 名称 + 简介 + 标签 + 链接 */
function renderProjectCard(proj) {
  const card = el("article", "project-card glass");

  // 预览图：无地址或加载失败时展示占位图
  if (proj.imageUrl) {
    const img = document.createElement("img");
    img.className = "project-image";
    img.src = proj.imageUrl;
    img.alt = proj.name || "";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.replaceWith(makeProjectPlaceholder());
    });
    card.appendChild(img);
  } else {
    card.appendChild(makeProjectPlaceholder());
  }

  card.appendChild(el("h3", "project-name", proj.name || ""));

  if (proj.description) {
    card.appendChild(el("p", "project-desc", proj.description));
  }

  // 技术标签
  if (Array.isArray(proj.tags) && proj.tags.length) {
    const tags = el("div", "project-tags");
    proj.tags.forEach((t) => {
      if (t) tags.appendChild(el("span", "project-tag", t));
    });
    card.appendChild(tags);
  }

  // Demo / GitHub 链接
  const links = el("div", "project-links");
  if (proj.demoUrl) links.appendChild(makeProjectLink("在线预览", proj.demoUrl));
  if (proj.githubUrl) links.appendChild(makeProjectLink("GitHub", proj.githubUrl));
  if (links.childNodes.length) card.appendChild(links);

  return card;
}

/* 项目图片占位：图片地址缺失或加载失败时展示 */
function makeProjectPlaceholder() {
  return el("div", "project-image project-image-placeholder", "暂无预览图");
}

function makeProjectLink(label, href) {
  const a = document.createElement("a");
  a.className = "project-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

/* ------------------------------------------------------------
   页脚
   ------------------------------------------------------------ */
function renderFooter(config) {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  const name = (config.profile && config.profile.name) || "";
  footer.textContent = "© " + new Date().getFullYear() + " " + name;
}
