import React, { useMemo } from 'react';
import { compsForHero, tz } from '../lib/recommend.js';
import { TribeGroups } from '../ui.jsx';

export default function Comps({ lobby }) {
  const items = useMemo(() => compsForHero(null, lobby), [lobby]);
  return (
    <div>
      <section className="card">
        <h3>流派大全</h3>
        <p className="muted small">先点种族，再看这个种族下的各个流派。每个流派都有核心思路、什么时候转、怎么玩和站位。</p>
        {lobby.length > 0 && <p className="muted small">已按本局种族过滤：{lobby.map(tz).join('、')}</p>}
      </section>
      <TribeGroups items={items} lobby={lobby} />
    </div>
  );
}
