import React, { useMemo } from 'react';
import { compsForHero, tz } from '../lib/recommend.js';
import { CompCard } from '../ui.jsx';

export default function Comps({ lobby }) {
  const groups = useMemo(() => {
    const g = new Map();
    for (const x of compsForHero(null, lobby)) {
      const k = x.comp.tribe ? tz(x.comp.tribe) : '中立';
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(x);
    }
    return [...g];
  }, [lobby]);
  return (
    <div>
      <section className="card">
        <h3>流派大全</h3>
        <p className="muted small">按种族分组，每个流派都有核心思路、什么时候转、怎么玩和站位。打法根据当前版本卡牌效果整理。</p>
        {lobby.length > 0 && <p className="muted small">已按本局种族过滤：{lobby.map(tz).join('、')}</p>}
      </section>
      {groups.map(([tribe, list]) => (
        <section key={tribe}>
          <h3 className="section-title">{tribe}</h3>
          {list.map((x) => (
            <CompCard key={x.comp.id} comp={x.comp} reasons={x.reasons} lobby={lobby} />
          ))}
        </section>
      ))}
    </div>
  );
}
