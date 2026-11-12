import React, { useMemo } from 'react';
import { data, heroTier } from '../lib/recommend.js';
import { Img, TIER_LABEL } from '../ui.jsx';

export default function Heroes({ onPick }) {
  const groups = useMemo(() => {
    const g = [[], [], [], [], []];
    data.heroes
      .filter((h) => h.stats)
      .sort((a, b) => a.stats.avg - b.stats.avg)
      .forEach((h) => g[heroTier.get(h.id)].push(h));
    return g;
  }, []);
  return (
    <div>
      <section className="card">
        <h3>英雄榜（单人 · 当前版本）</h3>
        <p className="muted small">按平均名次排序，越低越强。点英雄直接去定阵容。</p>
      </section>
      {groups.map((list, t) => (
        <section key={t}>
          <h3 className="section-title">
            <span className={'badge t' + t}>{TIER_LABEL[t]}</span> {list.length} 个
          </h3>
          <div className="list">
            {list.map((h) => (
              <button key={h.id} className="list-row" onClick={() => onPick(h.id)}>
                <Img src={h.img} alt={h.zh} className="avatar" />
                <div className="grow">
                  <div>{h.zh}</div>
                  <div className="muted small">【{h.power?.zh}】</div>
                </div>
                <div className="right">
                  <div className="stat-n sm">{h.stats.avg}</div>
                  <div className="muted tiny">{(h.stats.games / 1000).toFixed(1)}k 局</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
