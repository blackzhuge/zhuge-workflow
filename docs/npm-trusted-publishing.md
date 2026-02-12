# npm 自动发布（GitHub Actions + Trusted Publishing）

本文档对应工作流：`.github/workflows/publish-npm.yml`

## 一次性配置

1. 在 npm 网站创建并验证账号（邮箱 + 2FA 建议开启）
2. 打开 npm 包页面（首次可先本地发过一次），进入 **Package Settings**
3. 在 **Trusted publishers** 中添加 GitHub Actions 发布者：
   - Owner: `blackzhuge`
   - Repository: `zhuge-workflow`
   - Workflow filename: `publish-npm.yml`
   - Environment name: `npm`
4. 在 GitHub 仓库创建 Environment：
   - 路径：`Settings -> Environments -> New environment`
   - 名称：`npm`
   - 可选：添加保护规则（如仅允许 main 分支触发）

> Trusted Publishing 不需要 `NPM_TOKEN` Secret。

## 触发发布

### 方式一：打 tag 自动发布（推荐）

1. 更新版本号（示例：patch）

```bash
npm version patch
```

2. 推送 tag

```bash
git push origin --tags
```

工作流会在 tag 形如 `v1.2.3` 时自动执行发布。

### 方式二：手动触发

在 GitHub Actions 页面手动运行 `Publish npm package`。

## 工作流做了什么

1. 安装依赖（pnpm）
2. 跑单测：`pnpm test -- --run`
3. 跑类型检查：`pnpm lint`
4. 构建：`pnpm build`
5. 校验 tag 版本与 `package.json` 一致（tag 触发时）
6. 发布：`npm publish --access public`

> 当前 npm 对 GitHub **private** 仓库的 provenance 校验有限制。
> 若仓库为 private，请不要使用 `--provenance`。

## 常见问题

### 1) `requires trusted publisher` / `E403`

- 检查 npm 的 Trusted publisher 是否与仓库和 workflow 文件名完全一致。
- 检查 GitHub Environment 名是否为 `npm`。

### 2) `package.json version does not match tag`

- 例如 tag 是 `v0.1.1`，但 `package.json` 还是 `0.1.0`。
- 修正后重新打 tag。

### 3) 已发布版本重复

- npm 不允许覆盖已发布版本。
- 修改版本号后重新发布。
