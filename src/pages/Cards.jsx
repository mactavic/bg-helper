import React, { useMemo } from 'react';
import { data, minionById, rankCompsByCards, compAvailable } from '../lib/recommend.js';
import { MinionMini, CompCard, Empty } from '../ui.jsx';

export default function Cards({ lobby, picked, setPicked }) {
  // 所有阵容里出现的卡（只看本局可用的阵容）
  const cards = useMemo(() => {
    const ids = new Set();
    data.comps.filter((c) => compAvailable(c, lobby)).forEach((c) => c.cards.forEach((k) => ids.add(k.id)));
    return [...ids].map((id) => minionById.get(id)).filter(Boolean).sort((a, b) => a.tier - b.tier || a.zh.localeCompare(b.zh, 'zh'));
  }, [lobby]);
  const ranked = useMemo(() => rankCompsByCards(picked, lobby), [picked, lobby]);
  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  return (
    <div>
      <section className="card">
        <h3>看卡牌定方向</h3>
        <p className="muted small">
          点选商店里看到或手里拿到的卡，下面推荐对应阵容。{lobby.length ? '已按本局种族过滤。' : '在「定阵容」勾选种族后会自动过滤。'}
        </p>
        {picked.length > 0 && (
          <button className="link" onClick={() => setPicked([])}>
            清空（{picked.length}）
          </button>
        )}
      </section>

      {picked.length > 0 && (
        <section>
          <h3 className="section-title">匹配阵容</h3>
          {ranked.length === 0 ? (
            <Empty>没有阵容用到这些卡</Empty>
          ) : (
            ranked.slice(0, 3).map((x, i) => (
              <CompCard
                key={x.comp.id}
                comp={x.comp}
                lobby={lobby}
               
                reasons={[{ text: `命中 ${x.hits} 张阵容卡` }]}
              />
            ))
          )}
        </section>
      )}

      <div className="minion-grid">
        {cards.map((m) => (
          <MinionMini key={m.id} m={m} on={picked.includes(m.id)} onClick={() => toggle(m.id)} />
        ))}
      </div>
    </div>
  );
}
