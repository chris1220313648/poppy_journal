# Poppy Journal

一个私密、本地优先、可离线安装的电子手帐。照片、文字和项目数据均保存在浏览器 IndexedDB 中。

## 开发

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

生产构建输出到 `docs/`，用于 GitHub Pages 的 `/poppy/` 路径。

## 隐私

应用不包含账号、分析或内容上传。清理浏览器网站数据会删除本地手帐，请定期导出 `.poppyjournal` 项目包。
