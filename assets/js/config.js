/* ============================================================
   config.js —— 配置加载模块
   职责：读取网站配置。优先请求后端 /api/config，失败回退本地
         site-config.json，再回退内置默认占位数据，保证优雅降级。
   注意：所有前台文字、项目、简历、联系方式均由该配置驱动，
        不要在 HTML 中硬编码个人信息。
   ============================================================ */

// 默认占位数据：当后端接口与本地文件都不可用时使用，保证页面优雅降级。
const DEFAULT_CONFIG = {
  profile: {
    name: "你的名字",
    title: "岗位，例如：前端开发工程师",
    avatarUrl: "./assets/images/avatar.png",
    avatarBackText: "头像背面文字",
    bio: "个人简短介绍"
  },
  contact: {
    emailBase64: "Base64 编码后的邮箱",
    githubUrl: "https://github.com/xxx",
    blogUrl: "",
    links: [
      { label: "知乎", url: "https://www.zhihu.com/people/xxx" },
      { label: "掘金", url: "https://juejin.cn/user/xxx" }
    ]
  },
  projects: [
    {
      id: "proj1",
      name: "项目名称",
      description: "项目简介",
      tags: ["JS", "HTML", "CSS"],
      imageUrl: "./assets/images/proj1.png",
      demoUrl: "在线预览地址",
      githubUrl: "项目仓库地址"
    }
  ],
  resume: {
    summary: "一句话个人总结（可选）",
    education: [],
    experience: [],
    skills: [
      { category: "前端", items: ["HTML", "CSS", "JavaScript"] }
    ]
  }
};

/**
 * 加载网站配置。
 * 优先请求 /api/config；失败回退本地 site-config.json；再回退默认值。
 * 加载来源记录到 window.CONFIG_STATUS，供页面判断是否降级并给出提示。
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfig() {
  // 1. 优先从后端接口读取（部署后 / wrangler pages dev 下可用）
  try {
    const res = await fetch("/api/config", { cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      setConfigStatus("api");
      return mergeConfig(DEFAULT_CONFIG, data);
    }
    // 非 2xx（如 500 / 404）落入下方降级逻辑
  } catch (err) {
    // 网络断开 / 请求失败，继续降级
  }

  // 2. 回退到本地 site-config.json（纯静态预览）
  try {
    const res = await fetch("./site-config.json", { cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      setConfigStatus("local");
      return mergeConfig(DEFAULT_CONFIG, data);
    }
  } catch (err) {
    // 忽略，继续使用默认配置
  }

  // 3. 最终回退：内置默认配置，保证页面不崩溃
  console.warn("[config] 无法读取配置，使用内置默认配置");
  setConfigStatus("default");
  return DEFAULT_CONFIG;
}

/** 记录配置来源，供前台展示降级提示 */
function setConfigStatus(source) {
  if (typeof window !== "undefined") {
    window.CONFIG_STATUS = { source: source, degraded: source !== "api" };
  }
}

/**
 * 浅合并配置：以默认配置为底，用外部配置覆盖已存在的顶层字段。
 * @param {Object} base 默认配置
 * @param {Object} extra 外部读取到的配置
 * @returns {Object} 合并结果
 */
function mergeConfig(base, extra) {
  const result = Object.assign({}, base);
  if (!extra || typeof extra !== "object") {
    return result;
  }
  Object.keys(base).forEach((key) => {
    if (typeof extra[key] !== "undefined") {
      result[key] = extra[key];
    }
  });
  return result;
}

// 供后台页面复用
if (typeof window !== "undefined") {
  window.DEFAULT_CONFIG = DEFAULT_CONFIG;
  window.loadConfig = loadConfig;
}
