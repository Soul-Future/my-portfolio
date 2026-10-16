-- 0001_init.sql —— 建表 + 种子数据

CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO site_config (id, data, updated_at)
VALUES (
  1,
  '{"profile":{"name":"你的名字","title":"岗位，例如：前端开发工程师","avatarUrl":"./assets/images/avatar.png","avatarBackText":"头像背面文字","bio":"个人简短介绍"},"contact":{"emailBase64":"Base64 编码后的邮箱","githubUrl":"https://github.com/xxx","blogUrl":"","links":[{"label":"知乎","url":"https://www.zhihu.com/people/xxx"},{"label":"掘金","url":"https://juejin.cn/user/xxx"}]},"projects":[{"id":"proj1","name":"项目名称","description":"项目简介","tags":["JS","HTML","CSS"],"imageUrl":"./assets/images/proj1.png","demoUrl":"在线预览地址","githubUrl":"项目仓库地址"}],"resume":{"summary":"一句话个人总结（可选）","education":[{"school":"学校","major":"专业","degree":"学历","period":"起止时间，例如 2020 - 2024","description":"在校经历 / 荣誉（可选）"}],"experience":[{"company":"公司 / 组织","role":"职位 / 角色","period":"起止时间","description":"工作内容与成果"}],"skills":[{"category":"前端","items":["HTML","CSS","JavaScript"]}]}}',
  datetime('now')
);
