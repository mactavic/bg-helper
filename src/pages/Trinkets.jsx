import React, { useMemo, useState } from 'react';
import { data, compById, compName, heroById, compsForHero, scoreTrinket, tz } from '../lib/recommend.js';
import { TrinketRow, Empty } from '../ui.jsx';

export default function Trinkets({ lobby, heroId, cands, setCands, targetId, setTargetId }) {
  const [q, setQ] = useState('');
  const [size, setSize] = useState('all');
  const hero = heroById.get(heroId);
  const ranked = useMemo(() => compsForHero(hero, lobby), [hero, lobby]);
  const target = compById.get(targetId) && ranked.some((x) => x.comp.id === targetId) ? compById.get(targetId) : ranked[0]?.comp;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.trinkets
      .filter((t) => size === 'all' || t.size === size)
      .filter((t) => !lobby.length || !t.tribes.length || t.tribes.some((x) => lobby.includes(x)))
      .filter((t) => !s || t.zh.includes(s) || t.en.toLowerCase().includes(s) || t.text.includes(s))
      .sort((a, b) => a.zh.localeCompare(b.zh, 'zh'));
  }, [q, size, lobby]);

  const scored = cands
    .map((id) => data.trinkets.find((t) => t.id === id))
    .filter(Boolean)
    .map((t) => scoreTrinket(t, target, lobby))
    .sort((a, b) => b.s - a.s);

  const toggle = (id) =>
    setCands(cands.includes(id) ? cands.filter((x) => x !== id) : cands.length >= 4 ? cands : [...cands, id]);

  return (
    <div>
      <section className="card">
        <h3>饰品多选一</h3>
        <p className="muted small">从下面点选游戏里给你的候选饰品（最多 4 个），按与目标阵容的契合度排序。目前没有饰品统计数据，按规则判断。</p>
        <label className="small">
          目标阵容：
          <select value={target?.id || ''} onChange={(e) => setTargetId(e.target.value)}>
            {ranked.map((x) => (
              <option key={x.comp.id} value={x.comp.id}>
                {compName(x.comp)}
              </option>
            ))}
          </select>
        </label>
        {scored.length > 0 ? (
          <div className="cands">
            {scored.map((x, i) => (
              <div key={x.t.id} className={'cand' + (i === 0 ? ' best' : '')} onClick={() => toggle(x.t.id)}>
                {i === 0 && <div className="best-tag">推荐</div>}
                <TrinketRow t={x.t} why={x.why} score={x.s} />
              </div>
            ))}
            <button className="link" onClick={() => setCands([])}>
              清空候选
            </button>
          </div>
        ) : (
          <Empty>还没选候选饰品</Empty>
        )}
      </section>

      <section className="card">
        <div className="seg">
          {[
            ['all', '全部'],
            ['lesser', '小饰品'],
            ['greater', '大饰品'],
          ].map(([k, l]) => (
            <button key={k} className={size === k ? 'on' : ''} onClick={() => setSize(k)}>
              {l}
            </button>
          ))}
        </div>
        <input className="search" placeholder="搜索饰品名 / 效果" value={q} onChange={(e) => setQ(e.target.value)} />
        <p className="muted tiny">
          {list.length} 个{lobby.length ? `（已隐藏本局未开放种族：${data.tribes.filter((t) => !lobby.includes(t)).map(tz).join('、')}）` : ''}
        </p>
        <div className="list">
          {list.map((t) => (
            <div key={t.id} className={'pick-row' + (cands.includes(t.id) ? ' on' : '')} onClick={() => toggle(t.id)}>
              <TrinketRow t={t} why={t.tribes.length ? [t.tribes.map(tz).join('/')] : []} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
