import React, { createContext, useContext, useEffect, useState } from 'react';
import { data, imgUrl, minionById, tz, compName, compGuide, minionAvailable, heroTier, trinketsForComp, POWER_ORDER } from './lib/recommend.js';

export const TIER_LABEL = ['T0', 'T1', 'T2', 'T3', 'T4'];

export function TribeChips({ value, onChange, max = 5 }) {
  const toggle = (t) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));
    else if (value.length < max) onChange([...value, t]);
  };
  return (
    <div>
      <div className="chips">
        {data.tribes.map((t) => (
          <button key={t} className={'chip' + (value.includes(t) ? ' on' : '')} onClick={() => toggle(t)}>
            {tz(t)}
          </button>
        ))}
      </div>
      <div className="row muted small">
        已选 {value.length}/{max}
        {value.length > 0 && (
          <button className="link" onClick={() => onChange([])}>
            清空
          </button>
        )}
      </div>
    </div>
  );
}

export function Img({ src, alt, className }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <div className={'img-ph ' + (className || '')}>{alt?.slice(0, 2)}</div>;
  return <img className={className} src={imgUrl(src)} alt={alt} loading="lazy" onError={() => setErr(true)} />;
}

export function TierBadge({ heroId }) {
  const t = heroTier.get(heroId);
  if (t == null) return <span className="badge t-na">—</span>;
  return <span className={'badge t' + t}>{TIER_LABEL[t]}</span>;
}

export function PowerBadge({ power }) {
  if (!power) return null;
  return <span className={'badge p' + power}>{power}</span>;
}

// ---------- 卡牌详情（全站通用弹层） ----------
const CardCtx = createContext(() => {});
export const useCardDetail = () => useContext(CardCtx);

export function CardDetailProvider({ children }) {
  const [id, setId] = useState(null);
  useEffect(() => {
    if (id == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setId(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [id]);
  return (
    <CardCtx.Provider value={setId}>
      {children}
      {id != null && <CardDetail id={id} onClose={() => setId(null)} />}
    </CardCtx.Provider>
  );
}

function CardDetail({ id, onClose }) {
  const m = minionById.get(id);
  if (!m) return null;
  const inComps = data.comps
    .map((c) => ({ c, k: c.cards.find((k) => k.id === id) }))
    .filter((x) => x.k)
    .sort((a, b) => (a.k.status === 'CORE' ? 0 : 1) - (b.k.status === 'CORE' ? 0 : 1));
  const trinkets = data.trinkets.filter((t) => t.mentions.includes(id) || (m.zh.length > 1 && t.text.includes(m.zh)));
  return (
    <div className="detail-mask" onClick={onClose}>
      <div className="detail" onClick={(e) => e.stopPropagation()}>
        <button className="detail-x" onClick={onClose} aria-label="关闭">
          ✕
        </button>
        <Img src={m.img} alt={m.zh} className="detail-img" />
        <div className="detail-name">{m.zh}</div>
        <div className="muted small">{m.en}</div>
        <div className="detail-tags">
          <span className="chip static">⭐ {m.tier} 星</span>
          <span className="chip static">{m.tribes.length ? m.tribes.map(tz).join(' / ') : '中立'}</span>
        </div>
        <div className="detail-text">{m.text || '（无效果）'}</div>
        {inComps.length > 0 && (
          <>
            <h4>所属流派</h4>
            <div className="detail-list">
              {inComps.map(({ c, k }) => (
                <div key={c.id} className="detail-li">
                  <span>{compName(c)}</span>
                  <span className={'badge ' + (k.status === 'CORE' ? 'p-core' : 'p-addon')}>{k.status === 'CORE' ? '核心' : '配件'}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {trinkets.length > 0 && (
          <>
            <h4>相关饰品</h4>
            {trinkets.map((t) => (
              <TrinketRow key={t.id} t={t} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** 卡牌小方块：默认点击打开详情 */
export function MinionMini({ m, onClick, on, status }) {
  const open = useCardDetail();
  return (
    <button className={'minion' + (on ? ' on' : '')} onClick={onClick || (() => open(m.id))}>
      <Img src={m.img} alt={m.zh} className="minion-img" />
      <div className="minion-name">{m.zh}</div>
      <div className="minion-meta">
        ⭐{m.tier} {m.tribes.length ? m.tribes.map(tz).join('/') : '中立'}
        {status && status !== 'CORE' ? <span className="muted"> · 配件</span> : null}
      </div>
    </button>
  );
}

/** 文字里的卡名：点击打开详情 */
export function CardName({ m, className = '', children }) {
  const open = useCardDetail();
  return (
    <button
      className={'cardname ' + className}
      onClick={(e) => {
        e.stopPropagation();
        open(m.id);
      }}
    >
      {children ?? m.zh}
    </button>
  );
}

export function TrinketRow({ t, why, score }) {
  return (
    <div className="trinket">
      <div className="trinket-head">
        <span className={'badge ' + (t.size === 'greater' ? 'big' : 'small')}>{t.size === 'greater' ? '大饰品' : '小饰品'}</span>
        <b>{t.zh}</b>
        {score != null && <span className="score">{score > 0 ? '+' : ''}{score}</span>}
      </div>
      <div className="small">{t.text}</div>
      {why?.length > 0 && <div className="why small">{why.join(' · ')}</div>}
    </div>
  );
}

/** 流派卡片：思路 + 核心卡 + 展开后的打法步骤 / 过渡曲线 / 饰品 */
export function CompCard({ comp, reasons, lobby = [], defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const guide = compGuide(comp);
  const cards = comp.cards.map((k) => ({ ...k, m: minionById.get(k.id) })).filter((k) => k.m && minionAvailable(k.m, lobby));
  const core = cards.filter((k) => k.status === 'CORE');
  const byTier = {};
  cards.forEach((k) => (byTier[k.m.tier] ??= []).push(k));
  const trinkets = open ? trinketsForComp(comp, lobby) : [];
  return (
    <div className="card comp">
      <div className="comp-head" onClick={() => setOpen(!open)}>
        <div className="grow">
          <div className="comp-title">
            {compName(comp)} <PowerBadge power={comp.power} />
          </div>
          <div className="muted small">
            {comp.tribe ? tz(comp.tribe) : '中立'}
            {comp.difficulty ? ` · 难度 ${comp.difficulty}` : ''} · 核心 {core.length} 张
          </div>
        </div>
        <span className="chev">{open ? '收起' : '怎么玩 ▾'}</span>
      </div>
      {guide?.idea && <p className="idea">{guide.idea}</p>}
      {reasons?.length > 0 && (
        <ul className="reasons">
          {reasons.map((r, i) => (
            <li key={i} className={r.bad ? 'bad' : ''}>
              {r.text}
            </li>
          ))}
        </ul>
      )}
      <div className="hscroll">
        {core.map((k) => (
          <MinionMini key={k.id} m={k.m} />
        ))}
      </div>
      {open && (
        <div className="comp-body">
          {guide && (
            <>
              {guide.commit && (
                <>
                  <h4>🎯 什么时候转</h4>
                  <p className="small">{guide.commit}</p>
                </>
              )}
              {guide.steps?.length > 0 && (
                <>
                  <h4>📖 怎么玩</h4>
                  <ol className="steps">
                    {guide.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </>
              )}
              {guide.position && (
                <>
                  <h4>🧭 站位</h4>
                  <p className="small">{guide.position}</p>
                </>
              )}
            </>
          )}
          <h4>⚙ 过渡曲线（按星级）</h4>
          {Object.keys(byTier)
            .sort()
            .map((t) => (
              <div key={t} className="curve-row">
                <span className="curve-tier">⭐{t}</span>
                <span>
                  {byTier[t].map((k) => (
                    <CardName key={k.id} m={k.m} className={k.status === 'CORE' ? 'core' : 'muted'}>
                      {k.m.zh}
                      {k.status === 'CORE' ? '' : '（配件）'}
                    </CardName>
                  ))}
                </span>
              </div>
            ))}
          {comp.tip && (
            <>
              <h4>Firestone 原文（英文）</h4>
              <p className="small en">{comp.tip}</p>
              {comp.commit && <p className="small en"><b>When to commit:</b> {comp.commit}</p>}
            </>
          )}
          <h4>💎 适配饰品（规则推荐，无统计数据）</h4>
          {trinkets.length === 0 && <p className="muted small">没有明显契合的饰品</p>}
          {['lesser', 'greater'].map((size) => {
            const list = trinkets.filter((x) => x.t.size === size).slice(0, 4);
            return list.length ? (
              <div key={size}>
                {list.map((x) => (
                  <TrinketRow key={x.t.id} t={x.t} why={x.why} />
                ))}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

/** 按种族折叠的流派列表：先列种族，点开再显示该种族下的流派 */
export function TribeGroups({ items, lobby = [], defaultOpen = null }) {
  const groups = [];
  const idx = new Map();
  for (const x of items) {
    const k = x.comp.tribe || 'Neutral';
    if (!idx.has(k)) {
      idx.set(k, groups.length);
      groups.push({ key: k, label: x.comp.tribe ? tz(x.comp.tribe) : '中立', list: [] });
    }
    groups[idx.get(k)].list.push(x);
  }
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="tribe-groups">
      {groups.map((g) => {
        const isOpen = open === g.key;
        return (
          <div key={g.key} className={'tribe-group' + (isOpen ? ' open' : '')}>
            <button
              className="tribe-head"
              onClick={(e) => {
                setOpen(isOpen ? null : g.key);
                if (!isOpen) {
                  const el = e.currentTarget;
                  setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
                }
              }}
            >
              <span className="tribe-name">{g.label}</span>
              <span className="tribe-count">{g.list.length} 个流派</span>
              <span className="tribe-preview">{g.list.map((x) => compName(x.comp).replace(g.label, '').trim() || compName(x.comp)).join(' · ')}</span>
              <span className="tribe-arrow">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="tribe-body">
                {g.list.map((x) => (
                  <CompCard key={x.comp.id} comp={x.comp} reasons={x.reasons} lobby={lobby} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function sortByPower(comps) {
  return [...comps].sort((a, b) => POWER_ORDER.indexOf(a.power) - POWER_ORDER.indexOf(b.power));
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
