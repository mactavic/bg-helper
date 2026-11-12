import data from '../data/bg.json';
import compNamesZh from '../data/comp-names-zh.json';
import compGuides from '../data/comp-guides-zh.json';

export { data };

export const HSBG = 'https://hsbg.cards';

export const TRIBE_ZH = {
  Beast: '野兽', Demon: '恶魔', Dragon: '龙', Elemental: '元素', Mech: '机械', Murloc: '鱼人',
  Pirate: '海盗', Quilboar: '野猪人', Undead: '亡灵', Naga: '纳迦', Aberration: '畸变怪', All: '全种族',
};
export const tz = (t) => TRIBE_ZH[t] || t;

export const minionById = new Map(data.minions.map((m) => [m.id, m]));
export const heroById = new Map(data.heroes.map((h) => [h.id, h]));
export const compById = new Map(data.comps.map((c) => [c.id, c]));

export const compName = (c) => compNamesZh[c.id] || c.en;
export const compGuide = (c) => compGuides[c.id] || null;

const POWER = { S: 4, A: 3, B: 2, C: 1 };
export const POWER_ORDER = ['S', 'A', 'B', 'C'];

// ---------- 英雄档位：按平均名次分位数 ----------
const ranked = data.heroes.filter((h) => h.stats).sort((a, b) => a.stats.avg - b.stats.avg);
const CUTS = [0.11, 0.27, 0.58, 0.86]; // T0 / T1 / T2 / T3 / T4
export const heroTier = new Map(
  ranked.map((h, i) => {
    const p = i / ranked.length;
    return [h.id, CUTS.findIndex((c) => p < c) === -1 ? 4 : CUTS.findIndex((c) => p < c)];
  }),
);

/** 本局预估均名：英雄均名 + 本局开放种族对该英雄的影响之和 */
export function heroEstimate(hero, lobby) {
  if (!hero?.stats) return null;
  const imp = lobby.reduce((s, t) => s + (hero.stats.tribes[t] ?? 0), 0);
  return { base: hero.stats.avg, est: +(hero.stats.avg + imp).toFixed(2), imp: +imp.toFixed(2) };
}

/** 阵容是否在本局可用：主种族必须开放（中立阵容总是可用） */
export const compAvailable = (c, lobby) => !c.tribe || lobby.length === 0 || lobby.includes(c.tribe);

/**
 * 本局可用流派：不做强度排名，只标出“适合这个英雄”的流派。
 * 适合 = 英雄技能文本提到该流派主种族，或该英雄在有这个种族的对局里均名明显更好（≤ -0.03）。
 * 返回顺序：适合的在前，其余按种族分组。
 */
export function compsForHero(hero, lobby) {
  return data.comps
    .filter((c) => compAvailable(c, lobby))
    .map((c) => {
      const reasons = [];
      if (c.tribe && hero?.power?.text?.includes(tz(c.tribe))) reasons.push({ text: `英雄技能和${tz(c.tribe)}相关` });
      const imp = c.tribe ? hero?.stats?.tribes?.[c.tribe] : null;
      if (imp != null && imp <= -0.03) reasons.push({ text: `该英雄在有${tz(c.tribe)}的对局均名 ${imp}` });
      const missing = c.tribes.filter((t) => t !== c.tribe && lobby.length && !lobby.includes(t));
      if (missing.length) reasons.push({ bad: true, text: `部分卡是${missing.map(tz).join('、')}，本局没开` });
      return { comp: c, fit: reasons.some((r) => !r.bad), reasons };
    })
    .sort((a, b) => b.fit - a.fit || tribeKey(a.comp).localeCompare(tribeKey(b.comp), 'zh') || compName(a.comp).localeCompare(compName(b.comp), 'zh'));
}
const tribeKey = (c) => (c.tribe ? tz(c.tribe) : '~中立');

/** 饰品对某个阵容的匹配度（没有饰品统计数据，纯规则） */
export function scoreTrinket(t, comp, lobby = []) {
  let s = 0;
  const why = [];
  if (comp) {
    const ids = new Set(comp.cards.map((k) => k.id));
    const hit = comp.cards
      .map((k) => minionById.get(k.id))
      .filter((m) => t.mentions.includes(m.id) || (m.zh.length > 1 && t.text.includes(m.zh)));
    if (hit.length || t.mentions.some((id) => ids.has(id))) {
      s += 4;
      why.push(`提到阵容卡：${hit.map((m) => m.zh).join('、') || '核心卡'}`);
    }
  }
  if (t.tribes.length) {
    if (comp?.tribe && t.tribes.includes(comp.tribe)) {
      s += 3;
      why.push(`${tz(comp.tribe)}饰品`);
    } else if (comp && t.tribes.some((x) => comp.tribes.includes(x))) {
      s += 1.5;
      why.push(`${t.tribes.map(tz).join('/')}饰品，阵容里有用到`);
    } else if (lobby.length && !t.tribes.some((x) => lobby.includes(x))) {
      s -= 5;
      why.push(`${t.tribes.map(tz).join('/')}本局没开`);
    } else {
      s -= 1;
      why.push(`${t.tribes.map(tz).join('/')}饰品，与阵容无关`);
    }
  } else {
    s += 0.5;
    why.push('通用饰品');
  }
  return { t, s, why };
}

export function trinketsForComp(comp, lobby) {
  return data.trinkets
    .map((t) => scoreTrinket(t, comp, lobby))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s);
}

/** 看卡牌：根据已勾选的卡反推阵容 */
export function rankCompsByCards(selectedIds, lobby) {
  const sel = new Set(selectedIds);
  return data.comps
    .filter((c) => compAvailable(c, lobby))
    .map((c) => {
      const hits = c.cards.filter((k) => sel.has(k.id));
      const score = hits.reduce((s, k) => s + (k.status === 'CORE' ? 2 : 1), 0) + (POWER[c.power] ?? 1) * 0.1;
      return { comp: c, score, hits: hits.length };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.score - a.score);
}

export const imgUrl = (p) => (p ? HSBG + p : '');
