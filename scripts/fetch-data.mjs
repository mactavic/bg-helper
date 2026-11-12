// 拉取酒馆战棋数据，生成 src/data/bg.json
// 数据源：
//   hsbg.cards          —— 当前卡池（英雄 / 随从 / 饰品 / 星级 / 种族 / 卡图），限速 120 次/分钟
//   HearthstoneJSON     —— 简体中文卡名、描述、英雄技能
//   Firestone (非官方)  —— 英雄均名与种族影响、阵容评级与核心卡、英雄/阵容攻略
// 运行：npm run data
import { writeFile, mkdir } from 'node:fs/promises';

const HSBG = 'https://hsbg.cards';
const FS = 'https://static.zerotoheroes.com';
const OUT = new URL('../src/data/bg.json', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, { retries = 3 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } });
    if (res.ok) return { json: await res.json(), res };
    if (res.status === 429 && i < retries) {
      console.warn('  429 rate limited, waiting 30s…');
      await sleep(30000);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
}

// ---------- 1. hsbg.cards 当前卡池 ----------
async function fetchHsbgPool() {
  const all = [];
  let offset = 0;
  while (offset != null) {
    const { json, res } = await getJson(`${HSBG}/api/v1/cards?pool=current&limit=100&offset=${offset}`);
    all.push(...json.data);
    offset = json.pagination?.nextOffset ?? null;
    const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? 100);
    process.stdout.write(`\r  hsbg.cards: ${all.length}/${json.pagination?.total}  `);
    await sleep(remaining < 10 ? 15000 : 600); // 远低于 120 次/分钟
  }
  console.log();
  return all;
}

// ---------- 文本清理 ----------
const clean = (t) =>
  (t || '')
    .replace(/\[x\]/g, '')
    .replace(/<\/b>\s*\n\s*/g, '</b> ') // 关键词（如“被动”）后的换行保留为空格
    .replace(/<\/?(b|i)>/g, '')
    .replace(/\$(\d+)/g, '$1')
    .replace(/\s*\n\s*/g, '')
    .trim();

const RACE_TO_TRIBE = {
  BEAST: 'Beast', DEMON: 'Demon', DRAGON: 'Dragon', ELEMENTAL: 'Elemental', MECHANICAL: 'Mech',
  MURLOC: 'Murloc', PIRATE: 'Pirate', QUILBOAR: 'Quilboar', UNDEAD: 'Undead', NAGA: 'Naga', ABERRATION: 'Aberration',
};
// Firestone tribeStats 里的数字是游戏内 Race 枚举
const RACE_ID_TO_TRIBE = { 11: 'Undead', 14: 'Murloc', 15: 'Demon', 17: 'Mech', 18: 'Elemental', 20: 'Beast', 23: 'Pirate', 24: 'Dragon', 43: 'Quilboar', 92: 'Naga', 126: 'Aberration' };

async function main() {
  console.log('1/3 hsbg.cards 卡池…');
  const pool = await fetchHsbgPool();
  const typeCount = {};
  pool.forEach((c) => (typeCount[c.cardType] = (typeCount[c.cardType] || 0) + 1));
  console.log('  类型统计：', typeCount);

  console.log('2/3 HearthstoneJSON 中文数据…');
  const { json: zhAll } = await getJson('https://api.hearthstonejson.com/v1/latest/zhCN/cards.json');
  const zhByDbf = new Map(zhAll.map((c) => [c.dbfId, c]));
  const zhById = new Map(zhAll.map((c) => [c.id, c]));
  const zh = (c) => zhByDbf.get(c.id) || zhById.get(c.externalId);

  console.log('3/3 Firestone 统计与攻略…');
  // 注意：hero-stats（不带 duo）是单人模式统计；双打在 api/bgs/duo/... 下，这里不用
  const [{ json: heroStatsRaw }, { json: compsRaw }, { json: heroStratRaw }, { json: patchesRaw }] = await Promise.all([
    getJson(`${FS}/api/bgs/hero-stats/mmr-100/last-patch/overview-from-hourly.gz.json`),
    getJson(`${FS}/hearthstone/data/battlegrounds-strategies/bgs-comps-strategies.gz.json`),
    getJson(`${FS}/hearthstone/data/battlegrounds-strategies/bgs-hero-strategies.gz.json`),
    getJson(`${FS}/hearthstone/data/patches.json`),
  ]);

  // 当前酒馆战棋版本：只保留这个版本（含之后）的攻略内容
  const curPatchNo = patchesRaw.currentBattlegroundsMetaPatch;
  const curPatch = patchesRaw.patches.find((p) => p.number === curPatchNo);
  const curPatchDate = curPatch ? new Date(curPatch.date) : null;
  const isCurrent = (tip) =>
    (tip.patchNumber ?? tip.patch ?? 0) >= curPatchNo || (curPatchDate && tip.date && new Date(tip.date) >= curPatchDate);
  console.log(`  当前版本 ${curPatch?.version} (${curPatchNo})，上线 ${curPatch?.date}`);

  // 只要单人：去掉双打专属内容
  const solo = (c) => !c.isDuosOnly;

  // ---------- 随从 ----------
  const minions = pool
    .filter(solo)
    .filter((c) => c.cardType === 'minion' && c.tier && (c.categories || []).includes('tavern'))
    .map((c) => {
      const z = zh(c);
      const tribes = (c.minionTypes || []).filter((t) => t && t !== 'Neutral');
      return {
        id: c.id, cid: c.externalId, en: c.name.trim(), zh: z?.name || c.name.trim(),
        text: clean(z?.text) || clean(c.text), tier: c.tier, tribes,
        img: c.image,
      };
    });
  const minionByCid = new Map(minions.map((m) => [m.cid, m]));

  // 当前轮换中的种族：至少有 8 张随从（排除只以双种族身份零星出现的种族，如本版本的纳迦）
  const tribeCount = {};
  minions.flatMap((m) => m.tribes).forEach((t) => (tribeCount[t] = (tribeCount[t] || 0) + 1));
  const tribes = Object.keys(tribeCount).filter((t) => t !== 'All' && tribeCount[t] >= 8).sort();

  // ---------- 英雄 ----------
  const fsHero = new Map(heroStatsRaw.heroStats.map((h) => [h.heroCardId, h]));
  const tipsByHero = new Map(heroStratRaw.heroes.map((h) => [h.cardId, h.tips || []]));
  const heroes = pool
    .filter(solo)
    .filter((c) => c.cardType === 'hero' && c.isHero && !c.isHeroSkin)
    .map((c) => {
      const z = zh(c);
      const hp = z?.heroPowerDbfId ? zhByDbf.get(z.heroPowerDbfId) : null;
      const s = fsHero.get(c.externalId);
      const tip = (tipsByHero.get(c.externalId) || []).find((t) => t.language === 'enUS' && isCurrent(t));
      return {
        id: c.id, cid: c.externalId, en: c.name.trim(), zh: z?.name || c.name.trim(), img: c.image,
        armor: c.armor,
        power: hp ? { zh: hp.name, text: clean(hp.text), cost: hp.cost } : null,
        stats: s
          ? {
              avg: s.averagePosition, games: s.dataPoints,
              pickRate: s.totalOffered ? +(s.totalPicked / s.totalOffered).toFixed(3) : null,
              dist: s.placementDistribution.map((p) => +p.percentage.toFixed(1)),
              tribes: Object.fromEntries(
                (s.tribeStats || [])
                  .filter((t) => RACE_ID_TO_TRIBE[t.tribe])
                  .map((t) => [RACE_ID_TO_TRIBE[t.tribe], +t.impactAveragePosition.toFixed(3)]),
              ),
            }
          : null,
        tip: tip?.summary || null,
      };
    });

  // ---------- 饰品 ----------
  const trinkets = pool
    .filter(solo)
    .filter((c) => c.cardType === 'trinket')
    .map((c) => {
      const z = zh(c);
      return {
        id: c.id, cid: c.externalId, en: c.name.trim(), zh: z?.name || c.name.trim(),
        text: clean(z?.text) || clean(c.text), size: c.trinketTier || null, cost: c.manaCost,
        tribes: (c.minionTypes || []).filter((t) => t && t !== 'Neutral' && t !== 'All'),
        mentions: c.textMentionIds || [], img: c.image,
      };
    });

  // ---------- 阵容（Firestone 攻略） ----------
  const comps = compsRaw
    .filter((c) => c.compId?.trim() && c.name?.trim())
    .map((c) => {
      const cards = c.cards
        .filter((k) => k.cardId && k.cardId !== '#N/A' && minionByCid.has(k.cardId))
        .map((k) => ({ id: minionByCid.get(k.cardId).id, status: k.status }));
      const core = cards.filter((k) => k.status === 'CORE').map((k) => minions.find((m) => m.id === k.id));
      const count = {};
      core.flatMap((m) => m.tribes).filter((t) => t !== 'All').forEach((t) => (count[t] = (count[t] || 0) + 1));
      const mainTribe = c.compId.split('_')[0];
      const primary = tribes.find((t) => t.toLowerCase() === mainTribe) || Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      // 评级与打法跟随攻略日期：不是当前版本写的就不用
      const tip = (c.tips || []).find((t) => t.language === 'enUS' && isCurrent(t));
      return {
        id: c.compId, en: c.name, power: tip ? c.powerLevel || null : null, difficulty: tip ? c.difficulty || null : null,
        tribe: primary, tribes: Object.keys(count), cards,
        tip: tip?.tip || null, commit: tip?.whenToCommit || null, tipDate: tip?.date || null,
      };
    })
    .filter((c) => c.cards.length);

  const data = {
    generatedAt: new Date().toISOString(),
    sources: {
      cards: 'hsbg.cards', zh: 'HearthstoneJSON',
      heroStats: `Firestone 单人 · ${heroStatsRaw.lastUpdateDate.slice(0, 10)} · ${heroStatsRaw.dataPoints} 局`,
      comps: 'Firestone 阵容攻略',
    },
    patch: curPatch?.version || null,
    patchDate: curPatch?.date || null,
    compsCurrent: comps.filter((c) => c.tip).length,
    heroTipsCurrent: heroes.filter((h) => h.tip).length,
    tribes, heroes, minions, trinkets, comps,
  };
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data));
  console.log(`完成：英雄 ${heroes.length}（有统计 ${heroes.filter((h) => h.stats).length}），随从 ${minions.length}，饰品 ${trinkets.length}，阵容 ${comps.length}，种族 ${tribes.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
