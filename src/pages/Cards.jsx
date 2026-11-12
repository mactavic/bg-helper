import React, { useEffect, useMemo, useState } from 'react';
import { data, minionById, rankCompsByCards, compAvailable, minionAvailable, compName, tz } from '../lib/recommend.js';
import { Img, CompCard, Empty, useCardDetail, CardName } from '../ui.jsx';

const TIERS = ['all', 1, 2, 3, 4, 5, 6, 7];

export default function Cards({ lobby, picked, setPicked }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('all');
  const [focusId, setFocusId] = useState(null); // 底部显示效果的卡
  const [sheet, setSheet] = useState(false);
  const openCard = useCardDetail();

  // 本局可用流派里、本局能刷到的卡，以及每张卡用在哪些流派
  const { cards, usedIn } = useMemo(() => {
    const used = new Map();
    data.comps
      .filter((c) => compAvailable(c, lobby))
      .forEach((c) =>
        c.cards
          .filter((k) => minionAvailable(minionById.get(k.id), lobby))
          .forEach((k) => (used.get(k.id) || used.set(k.id, []).get(k.id)).push(compName(c))),
      );
    const list = [...used.keys()]
      .map((id) => minionById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.tier - b.tier || a.zh.localeCompare(b.zh, 'zh'));
    return { cards: list, usedIn: used };
  }, [lobby]);

  const tiersPresent = useMemo(() => new Set(cards.map((m) => m.tier)), [cards]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cards
      .filter((m) => tier === 'all' || m.tier === tier)
      .filter((m) => !s || m.zh.includes(s) || m.en.toLowerCase().includes(s) || m.text.includes(s));
  }, [cards, q, tier]);

  const ranked = useMemo(() => rankCompsByCards(picked, lobby), [picked, lobby]);
  // 匹配度最高的流派里还没拿到的核心卡 → 在列表里标“缺”
  const missing = useMemo(() => {
    const top = ranked[0]?.comp;
    if (!top) return new Set();
    return new Set(
      top.cards
        .filter((k) => k.status === 'CORE' && !picked.includes(k.id) && minionAvailable(minionById.get(k.id), lobby))
        .map((k) => k.id),
    );
  }, [ranked, picked, lobby]);

  const tap = (id) => {
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    setFocusId(id);
  };
  const focus = focusId ? minionById.get(focusId) : null;
  const showPanel = picked.length > 0 || focus;

  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [sheet]);
  useEffect(() => {
    if (!ranked.length) setSheet(false);
  }, [ranked.length]);

  return (
    <div className={showPanel ? 'has-panel' : ''}>
      <div className="tierbar">
        {TIERS.filter((t) => t === 'all' || tiersPresent.has(t)).map((t) => (
          <button key={t} className={tier === t ? 'on' : ''} onClick={() => setTier(t)}>
            {t === 'all' ? '全部' : `⭐${t}`}
          </button>
        ))}
      </div>
      <input className="search" placeholder="搜索卡名 / 效果" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="muted tiny hint">
        点卡牌 = 勾选并在底部显示效果；点右上角 ⓘ 看卡牌详情。{lobby.length ? '已按本局种族过滤。' : '在「定阵容」勾选种族后会自动过滤。'}
      </p>

      {shown.length === 0 && <Empty>没有符合的卡</Empty>}
      <div className="tile-grid">
        {shown.map((m) => {
          const on = picked.includes(m.id);
          const need = missing.has(m.id);
          return (
            <div key={m.id} className={'tile' + (on ? ' on' : '') + (need ? ' need' : '') + (focusId === m.id ? ' focus' : '')} onClick={() => tap(m.id)}>
              <Img src={m.img} alt={m.zh} className="tile-img" />
              <button
                className="tile-info"
                aria-label="查看详情"
                onClick={(e) => {
                  e.stopPropagation();
                  openCard(m.id);
                }}
              >
                ⓘ
              </button>
              {on && <span className="tile-check">✓</span>}
              {need && <span className="tile-need">缺</span>}
              <div className="tile-name">{m.zh}</div>
              <div className="tile-meta">
                ⭐{m.tier} {m.tribes.length ? m.tribes.map(tz).join('/') : '中立'}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部扩展栏：卡牌效果 + 已选 + 匹配摘要 */}
      {showPanel && (
        <div className="panel">
          {focus && (
            <div className="panel-card">
              <div className="panel-card-head">
                <CardName m={focus} className="panel-card-name">{focus.zh} ›</CardName>
                <span className="muted tiny">
                  ⭐{focus.tier} {focus.tribes.length ? focus.tribes.map(tz).join('/') : '中立'}
                </span>
                <button className="panel-x" onClick={() => setFocusId(null)} aria-label="关闭效果">
                  ✕
                </button>
              </div>
              <div className="panel-card-text">{focus.text || '（无效果）'}</div>
              {usedIn.get(focus.id) && <div className="muted tiny">用于：{usedIn.get(focus.id).join('、')}</div>}
            </div>
          )}
          {picked.length > 0 && (
            <>
              <div className="panel-picked">
                {picked.map((id) => (
                  <button key={id} className="pchip" onClick={() => setPicked(picked.filter((x) => x !== id))}>
                    {minionById.get(id)?.zh} ✕
                  </button>
                ))}
                <button className="pchip clear" onClick={() => setPicked([])}>
                  清空
                </button>
              </div>
              <button className="panel-match" onClick={() => ranked.length && setSheet(true)}>
                <span className="grow">
                  {ranked.length ? (
                    <>
                      <b>匹配 {ranked.length} 个流派</b>
                      <span className="panel-match-list">
                        {ranked.slice(0, 3).map((x) => `${compName(x.comp)}（${x.hits}）`).join(' · ')}
                      </span>
                    </>
                  ) : (
                    <b>没有流派用到这些卡</b>
                  )}
                </span>
                {ranked.length > 0 && <span className="panel-open">展开 ▲</span>}
              </button>
            </>
          )}
        </div>
      )}

      {/* 展开的匹配流派 */}
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
              {ranked.map((x, i) => {
                const core = x.comp.cards.filter((k) => k.status === 'CORE' && minionAvailable(minionById.get(k.id), lobby));
                const have = x.comp.cards.filter((k) => picked.includes(k.id));
                const lack = core.filter((k) => !picked.includes(k.id));
                return (
                  <CompCard
                    key={x.comp.id}
                    comp={x.comp}
                    lobby={lobby}
                    defaultOpen={i === 0}
                    reasons={[
                      { text: `已有：${have.map((k) => minionById.get(k.id)?.zh).join('、')}` },
                      ...(lack.length ? [{ bad: true, text: `还缺核心：${lack.map((k) => minionById.get(k.id)?.zh).join('、')}` }] : [{ text: '核心卡已齐' }]),
                    ]}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
