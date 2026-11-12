# 酒馆战棋助手

手机用的炉石传说酒馆战棋（**只有单人模式、只有当前版本**）助手：勾选本局种族 + 选英雄 → 推荐阵容和饰品。

## 页面

| 页面 | 作用 |
|---|---|
| 定阵容 | 选种族和英雄，看英雄统计（均名、选取率、名次分布、各种族影响），以及本局可用流派（适合该英雄的排前面） |
| 看卡牌 | 点选商店里看到的卡，反推阵容 |
| 饰品 | 点选游戏给的候选饰品，按与目标阵容的契合度排序 |
| 英雄榜 | 当前版本英雄按均名分 T0–T4 |
| 流派 | 全部流派按种族分组，每个都有思路 / 什么时候转 / 怎么玩 / 站位 |

## 数据来源

| 数据 | 来源 |
|---|---|
| 卡池（英雄、随从、饰品、星级、种族、卡图） | [hsbg.cards](https://hsbg.cards/api-docs) API（120 次/分钟/IP） |
| 中文名称和描述、英雄技能 | HearthstoneJSON（zhCN） |
| 英雄统计（单人，当前版本） | Firestone 公开统计文件（非官方接口，可能变化） |
| 阵容组成 / 评级 / 打法 | Firestone 阵容攻略；**评级和打法只在攻略写于当前版本时才显示** |

饰品没有统计数据，按规则推荐：提到阵容核心卡 +4，阵容主种族饰品 +3，阵容副种族 +1.5，通用 +0.5，种族未开放 −5。

规则都在 `src/lib/recommend.js`。流派中文名在 `src/data/comp-names-zh.json`，**流派打法在 `src/data/comp-guides-zh.json`**（根据当前版本卡牌效果整理，可直接修改；Firestone 新增的流派没有中文打法时只显示卡牌）。

## 本地开发

```bash
npm install
npm run data   # 拉取最新数据到 src/data/bg.json
npm run dev    # 手机和电脑同一 Wi-Fi 时，可用终端里显示的局域网地址在 iPhone 上打开
```

## 部署到 Vercel

1. 把这个文件夹推到一个 GitHub 仓库（`src/data/bg.json` 也提交，作为拉取失败时的后备数据）。
2. 在 Vercel 导入这个仓库，配置已经写在 `vercel.json` 里，不用改。
3. 每次部署都会先运行 `scripts/fetch-data.mjs` 重新拉数据；拉取失败就沿用仓库里的 `bg.json`。
4. 可选的每日自动刷新：Vercel 项目 Settings → Git → Deploy Hooks 生成一个链接，填进 GitHub 仓库的 Secrets（名字 `VERCEL_DEPLOY_HOOK`），`.github/workflows/refresh.yml` 会在每天北京时间 04:00 触发重新部署。

在 iPhone Safari 打开后点“分享 → 添加到主屏幕”，就能像 App 一样全屏使用。

> 中国大陆网络访问 `*.vercel.app` 和 hsbg.cards 的卡图可能较慢或不稳定，部署后请先用手机实测。
