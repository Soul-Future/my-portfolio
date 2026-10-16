// ============================================================
// default-config.js —— 默认占位配置（与前台 config.js 保持一致）
// ============================================================

export const DEFAULT_CONFIG = {
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
