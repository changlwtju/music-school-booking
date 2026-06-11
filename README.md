# 菠菜现代音乐

琴行学生约课与老师授课排班小程序项目，小程序名称暂定为“菠菜现代音乐”。

当前阶段已生成一版可运行 MVP：

- `miniprogram/`：原生微信小程序，包含学生端与老师端核心页面。
- `backend/`：Node.js + Express + SQLite API，包含预约、课表、合同、上课记录与老师月度课时统计基础接口。

## 本地运行

后端：

```bash
cd backend
npm install
npm run seed
npm run dev
```

默认接口地址为 `http://localhost:3010`。轻量服务器部署时可复制 `backend/.env.example` 为 `.env`，设置 `PORT`、`DATABASE_PATH`，后续再补微信 `appid/secret` 登录。

导入真实琴行数据：

```bash
cd backend
npm run import:music-school -- --dry-run
DATABASE_PATH=/var/lib/spinach-music/spinach-music.json npm run import:music-school
sudo systemctl restart spinach-music-api
```

默认读取 `docs/data-templates/music-school-import/music-school-import-current-yidian.xlsx`，导入前会自动备份当前 JSON 数据库。服务器已产生真实业务数据后不要再执行 `npm run seed`。

小程序：

1. 用微信开发者工具导入 `miniprogram/`。
2. 当前 `appid` 为游客测试值，正式提审前改为你的真实小程序 AppID。
3. 本地联调时保持后端运行；若后端不在线，小程序会使用内置 mock 数据展示页面。

## Documents

- [需求文档草案](docs/requirements/product-requirements-draft.md)
- [小程序从零到一开发教程](docs/tutorials/miniprogram-zero-to-one-tutorial.md)
