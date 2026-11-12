import React from 'react';
import { data } from './lib/recommend.js';
import { useStored } from './lib/store.js';
import Pick from './pages/Pick.jsx';
import Cards from './pages/Cards.jsx';
import Heroes from './pages/Heroes.jsx';
import Comps from './pages/Comps.jsx';
import Trinkets from './pages/Trinkets.jsx';

const TABS = [
  ['pick', '定阵容', '⚔️'],
  ['cards', '看卡牌', '🃏'],
  ['trinkets', '饰品', '💎'],
  ['heroes', '英雄榜', '👑'],
  ['comps', '流派', '📖'],
];

export default function App() {
  const [tab, setTab] = useStored('tab', 'pick');
  const [lobby, setLobby] = useStored('lobby', []);
  const [heroId, setHeroId] = useStored('hero', null);
  const [picked, setPicked] = useStored('picked', []);
  const [cands, setCands] = useStored('cands', []);
  const [targetId, setTargetId] = useStored('target', null);

  const go = (t) => {
    setTab(t);
    window.scrollTo(0, 0);
  };
  const lobbyValid = lobby.filter((t) => data.tribes.includes(t));

  return (
    <div className="app">
      <header className="top">
        <div className="brand">酒馆战棋助手</div>
        <div className="muted tiny">
          版本 {data.patch} · 单人 · 数据 {data.generatedAt.slice(0, 10)}
        </div>
      </header>
      <main>
        {tab === 'pick' && <Pick lobby={lobbyValid} setLobby={setLobby} heroId={heroId} setHeroId={setHeroId} />}
        {tab === 'cards' && <Cards lobby={lobbyValid} picked={picked} setPicked={setPicked} />}
        {tab === 'trinkets' && (
          <Trinkets lobby={lobbyValid} heroId={heroId} cands={cands} setCands={setCands} targetId={targetId} setTargetId={setTargetId} />
        )}
        {tab === 'heroes' && <Heroes onPick={(id) => { setHeroId(id); go('pick'); }} />}
        {tab === 'comps' && <Comps lobby={lobbyValid} />}
        <footer className="muted tiny">
          卡牌：hsbg.cards · 中文：HearthstoneJSON · 统计：{data.sources.heroStats}
        </footer>
      </main>
      <nav className="tabbar">
        {TABS.map(([k, label, icon]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
            <span className="tab-ico">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
