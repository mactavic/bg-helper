import React, { useMemo, useState } from 'react';
import { data, heroById, heroEstimate, compsForHero, tz } from '../lib/recommend.js';
import { TribeChips, Img, TierBadge, CompCard, Empty } from '../ui.jsx';

export function HeroGrid({ onPick, query }) {
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.heroes
      .filter((h) => !q || h.zh.includes(q) || h.en.toLowerCase().includes(q) || h.power?.zh?.includes(q))
      .sort((a, b) => (a.stats?.avg ?? 9) - (b.stats?.avg ?? 9));
  }, [query]);
  if (!list.length) return <Empty>没找到这个英雄</Empty>;
  return (
    <div className="hero-grid">
      {list.map((h) => (
        <button key={h.id} className="hero" onClick={() => onPick(h.id)}>
          <Img src={h.img} alt={h.zh} className="hero-img" />
          <div className="hero-name">{h.zh}</div>
          <div className="hero-power">【{h.power?.zh || '?'}】</div>
          <TierBadge heroId={h.id} />
        </button>
      ))}
    </div>
  );
}

function PlacementBar({ dist }) {
  const max = Math.max(...dist);
  return (
    <div className="dist">
      {dist.map((p, i) => (
        <div key={i} className="dist-col">
          <div className="dist-bar" style={{ height: `${(p / max) * 100}%` }} data-good={i < 4} />
          <div className="dist-lbl">{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

export function HeroPanel({ hero, lobby, onChange }) {
  const est = heroEstimate(hero, lobby);
  const s = hero.stats;
  return (
    <div className="card hero-panel">
      <div className="row">
        <Img src={hero.img} alt={hero.zh} className="hero-img-lg" />
        <div className="grow">
          <div className="hero-title">
            {hero.zh} <TierBadge heroId={hero.id} />
          </div>
          {hero.power && (
            <div className="small">
              <b>【{hero.power.zh}】</b>
              {hero.power.cost != null ? `(${hero.power.cost}费) ` : ''}
              {hero.power.text}
            </div>
          )}
          {onChange && (
            <button className="btn-sm" onClick={onChange}>
              换英雄
            </button>
          )}
        </div>
      </div>
      {s ? (
        <>
          <div className="stats">
            <div>
              <div className="stat-n">{s.avg}</div>
              <div className="stat-l">版本均名</div>
            </div>
            {est && lobby.length > 0 && (
              <div>
                <div className={'stat-n ' + (est.imp < 0 ? 'good' : est.imp > 0 ? 'bad' : '')}>{est.est}</div>
                <div className="stat-l">本局种族预估</div>
              </div>
            )}
            <div>
              <div className="stat-n">{Math.round((s.pickRate ?? 0) * 100)}%</div>
              <div className="stat-l">选取率</div>
            </div>
            <div>
              <div className="stat-n">{(s.games / 1000).toFixed(1)}k</div>
              <div className="stat-l">样本局数</div>
            </div>
          </div>
          <PlacementBar dist={s.dist} />
          {lobby.length > 0 && (
            <div className="chips small-chips">
              {lobby.map((t) => {
                const v = s.tribes[t];
                return (
                  <span key={t} className={'chip static ' + (v < 0 ? 'good' : v > 0 ? 'bad' : '')}>
                    {tz(t)} {v == null ? '—' : (v > 0 ? '+' : '') + v}
                  </span>
                );
              })}
            </div>
          )}
          <p className="muted tiny">种族数值 = 有该种族的对局里此英雄均名的变化，负数代表更好。</p>
        </>
      ) : (
        <p className="muted small">暂无该英雄的单人统计</p>
      )}
      {hero.tip && <p className="small en">💡 {hero.tip}</p>}
    </div>
  );
}

export default function Pick({ lobby, setLobby, heroId, setHeroId }) {
  const [query, setQuery] = useState('');
  const hero = heroById.get(heroId);
  const comps = useMemo(() => (hero ? compsForHero(hero, lobby) : []), [hero, lobby]);
  const fit = comps.filter((x) => x.fit);
  const rest = comps.filter((x) => !x.fit);

  return (
    <div>
      <section className="card">
        <h3>① 本局种族</h3>
        <TribeChips value={lobby} onChange={setLobby} />
      </section>

      {hero ? (
        <HeroPanel hero={hero} lobby={lobby} onChange={() => setHeroId(null)} />
      ) : (
        <section className="card">
          <h3>② 你的英雄</h3>
          <input className="search" placeholder="搜索英雄 / 技能名" value={query} onChange={(e) => setQuery(e.target.value)} />
          <HeroGrid query={query} onPick={(id) => { setHeroId(id); setQuery(''); window.scrollTo(0, 0); }} />
        </section>
      )}

      {hero && lobby.length === 0 && <Empty>先勾选本局开放的种族</Empty>}
      {hero && lobby.length > 0 && (
        <section>
          {comps.length === 0 && <Empty>本局种族没有可用流派</Empty>}
          {fit.length > 0 && <h3 className="section-title">✅ 适合这个英雄</h3>}
          {fit.map((x) => (
            <CompCard key={x.comp.id} comp={x.comp} reasons={x.reasons} lobby={lobby} />
          ))}
          {rest.length > 0 && (
            <h3 className="section-title">{fit.length ? '其他可用流派' : '本局可用流派'}（{rest.length}）</h3>
          )}
          {rest.map((x) => (
            <CompCard key={x.comp.id} comp={x.comp} reasons={x.reasons} lobby={lobby} />
          ))}
          <p className="muted tiny">流派打法根据当前版本卡牌效果整理，不代表强度排名。点“怎么玩”展开。</p>
        </section>
      )}
    </div>
  );
}
