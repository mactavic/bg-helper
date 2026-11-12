import React, { useEffect, useMemo, useState } from 'react';
import { data, minionById, rankCompsByCards, compAvailable, minionAvailable, compName, tz } from '../lib/recommend.js';
import { Img, CompCard, Empty } from '../ui.jsx';

export default function Cards({ lobby, picked, setPicked }) {
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);

  // 本局可用流派里出现的卡，以及每张卡用在哪些流派
  const { cards, usedIn } = useMemo(() => {
    const used = new Map();
    data.comps
      .filter((c) => compAvailable(c, lobby))
      .forEach((c) => c.cards.filter((k) => minionAvailable(minionById.get(k.id), lobby)).forEach((k) => (used.get(k.id) || used.set(k.id, []).get(k.id)).push(compName(c))));
    const list = [...used.keys()]
      .map((id) => minionById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.tier - b.tier || a.zh.localeCompare(b.zh, 'zh'));
    return { cards: list, usedIn: used };
  }, [lobby]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? cards.filter((m) => m.zh.includes(s) || m.en.toLowerCase().includes(s) || m.text.includes(s)) : cards;
  }, [cards, q]);
  const byTier = useMemo(() => {
    const g = {};
    shown.forEach((m) => (g[m.tier] ??= []).push(m));
    return Object.entries(g);
  }, [shown]);

  const ranked = useMemo(() => rankCompsByCards(picked, lobby), [picked, lobby]);
  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  // 打开弹层时禁止背景滚动
  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [sheet]);
  useEffect(() => {
    if (!picked.length) setSheet(false);
  }, [picked.length]);

  return (
    <div className={picked.length ? 'has-matchbar' : ''}>
      <section className="card">
        <h3>看卡牌定方向</h3>
        <p className="muted small">
          点选商店里看到或手里拿到的卡，匹配的流派会显示在屏幕底部。{lobby.length ? '已按本局种族过滤。' : '在「定阵容」勾选种族后会自动过滤。'}
        </p>
        <input className="search" placeholder="搜索卡名 / 效果" value={q} onChange={(e) => setQ(e.target.value)} />
      </section>

      {byTier.length === 0 && <Empty>没有符合的卡</Empty>}
      {byTier.map(([tier, list]) => (
        <section key={tier}>
          <h3 className="section-title">⭐{tier} 星</h3>
          <div className="card-list">
            {list.map((m) => {
              const on = picked.includes(m.id);
              return (
                <button key={m.id} className={'card-row' + (on ? ' on' : '')} onClick={() => toggle(m.id)}>
                  <Img src={m.img} alt={m.zh} className="card-row-img" />
                  <div className="grow">
                    <div className="card-row-head">
                      <b>{m.zh}</b>
                      <span className="muted tiny">{m.tribes.length ? m.tribes.map(tz).join('/') : '中立'}</span>
                      <span className={'check' + (on ? ' on' : '')}>{on ? '✓' : ''}</span>
                    </div>
                    <div className="card-row-text">{m.text || '（无效果）'}</div>
                    <div className="card-row-used">用于：{usedIn.get(m.id).join('、')}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* 底部固定的匹配栏 */}
      {picked.length > 0 && (
        <div className="matchbar" onClick={() => setSheet(true)}>
          <div className="grow">
            <div className="matchbar-title">
              已选 {picked.length} 张 · {ranked.length ? `匹配 ${ranked.length} 个流派` : '没有流派用到这些卡'}
            </div>
            {ranked.length > 0 && (
              <div className="matchbar-list">
                {ranked.slice(0, 3).map((x) => `${compName(x.comp)}（${x.hits}）`).join(' · ')}
              </div>
            )}
          </div>
          <button
            className="link"
            onClick={(e) => {
              e.stopPropagation();
              setPicked([]);
            }}
          >
            清空
          </button>
          {ranked.length > 0 && <span className="matchbar-open">查看 ▲</span>}
        </div>
      )}

      {/* 弹出的匹配流派详情 */}
      {sheet && (
        <div className="sheet-mask" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <b>匹配流派</b>
              <span className="muted small">按命中的卡数排序</span>
              <button className="link" onClick={() => setSheet(false)}>
                收起 ▼
              </button>
            </div>
            <div className="sheet-body">
              {ranked.map((x, i) => (
                <CompCard
                  key={x.comp.id}
                  comp={x.comp}
                  lobby={lobby}
                  defaultOpen={i === 0}
                  reasons={[
                    {
                      text: `命中 ${x.hits} 张：${x.comp.cards
                        .filter((k) => picked.includes(k.id))
                        .map((k) => minionById.get(k.id)?.zh)
                        .join('、')}`,
                    },
                  ]}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
