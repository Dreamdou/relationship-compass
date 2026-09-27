# 关系罗盘：即时反馈与答卷收集版

这是一个面向手机填写的成人关系偏好测评。网页托管在 GitHub Pages，答卷存储在 Supabase：填写者完成 104 道题并留下联系方式，成功提交到后台后立即获得简版反馈；问卷发起者登录 `admin.html` 查看答卷、统计类型、跟踪详细报告发送状态并导出 CSV。

## 已实现的流程

1. 填写者确认已成年并知晓数据用途。
2. 104 道题分页作答，浏览器自动保存未提交进度。
3. 填写 QQ、微信、邮箱或其他报告接收方式。
4. 明确同意后，答案、分数、类型和联系方式提交到数据库。
5. 只有后台提交成功，网页才显示即时简版反馈。
6. 发起者登录后台查看完整答案，制作详细画像并标记“待发送 / 制作中 / 已发送”。

## 第一步：建立免费数据后台

1. 注册或登录 [Supabase](https://supabase.com/)，新建一个 Project。
2. 打开 **SQL Editor → New query**。
3. 复制并运行 [`supabase/schema.sql`](supabase/schema.sql) 的全部内容。
4. 打开 **Authentication → Users → Add user**，创建你的管理员邮箱和密码。不要在填写者页面开放管理员注册。
5. 在项目的 **Connect** 或 **Settings → API Keys** 中找到：
   - Project URL，例如 `https://xxxx.supabase.co`
   - Publishable key，以 `sb_publishable_` 开头
6. 把这两项填入 [`config.js`](config.js)。**只能使用 Publishable key，绝不能把 Secret key 或旧的 service_role key 写进网页。**

初次配置示例：

```javascript
window.APP_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  publishableKey: "sb_publishable_xxxx",
  surveyId: "",
  surveySlug: "relationship-compass-v1",
  surveyTitle: "关系偏好与边界探索测评",
};
```

## 第二步：创建问卷编号

1. 先把网站发布到 GitHub Pages。
2. 打开 `https://你的网址/admin.html`，使用刚才创建的管理员账号登录。
3. 系统会为该账号创建问卷，并显示一串“问卷编号”。
4. 把编号粘贴到 `config.js` 的 `surveyId`，再次上传并发布。
5. 首页不再显示“后台尚未连接”后，即可正式生成二维码分发。

## 第三步：发布到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `relationship-compass`。如果使用 GitHub Free，Pages 通常需要公开仓库。
2. 把本目录内全部文件上传到仓库根目录，默认分支使用 `main`。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
5. 等待 `Deploy static questionnaire to GitHub Pages` 完成。
6. 把最终网址生成二维码。填写入口是网站首页；管理入口是同一网址加 `/admin.html`。

## 数据保护设计

- 未登录填写者只能新增一份答卷，不能读取、修改或删除任何答卷。
- 管理员登录后，只能读取属于自己问卷的答卷。
- 数据库已启用 Row Level Security，并撤销不必要的公开权限。
- 联系方式、答案和分析结果不会写入 GitHub 仓库。
- 浏览器使用 Publishable key；它不是读取后台数据的管理员密钥。
- 未完成答题的进度仍会暂存在填写者设备，成功提交后的正式数据进入 Supabase。
- 当前没有宣称“绝对保密”，因为任何联网系统都不能做这种保证；页面会准确说明收集者、用途和删除方式。

建议在正式大规模发布前，补充发起者名称、联系方式、预计保存期限和具体删除申请方式，并定期导出备份、删除不再需要的联系方式。

## 修改题目

正式题库来自上一级目录的 Word 问卷。修改 Word 后运行：

```powershell
& 'C:\Users\lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\tools\extract_questions.py
```

脚本会重新生成 `questions.js`。题目代码、维度和正反向计分必须保持一致。

## 重要说明

本项目用于成年人的关系沟通与自我探索，不是医疗、心理或人格诊断工具。任何关系实践都应建立在知情、自愿、可随时撤回的同意上。后台报告建议使用“沟通建议”而不是操控、施压或规避边界的所谓“攻略”。
