import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, Line, OrbitControls, Text } from '@react-three/drei';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScriptStudio from './ScriptStudio';

type Center = { id: string; name: string; status: string; detail: string; tasks: string[] };
type State = { mode: string; user: string; cycle: number; day: number; days: number; elixir: number; published: number; goal: number; centers: Center[]; approvals: Array<{ id: string; center: string; task: string; minutes: number; status: string; payload: string }>; events: Array<{ at: string; center: string; message: string }> };
type Page = 'world' | 'dashboard' | 'analytics' | 'workflow';
type LabTab = 'overview' | 'team' | 'chat' | 'reflection' | 'studio';
type ChatLine = { by: 'you' | 'manager'; text: string };
type OperatorLine = { by: 'you' | 'coo'; text: string; center?: Center; tab?: LabTab };
const api = async (path: string, init?: RequestInit) => {
  const r = await fetch((import.meta.env.VITE_API_URL ?? '') + path, { ...init, credentials: 'include', headers: { 'content-type': 'application/json', ...init?.headers } });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? 'Er ging iets mis.');
  return data;
};
const colors: Record<string, string> = { running: '#35bd90', ready: '#53a8dc', waiting: '#eda84c', sleeping: '#889c9b', locked: '#9a91ae' };
const statusNames: Record<string, string> = { running: 'Actief', ready: 'Klaar', waiting: 'Wacht op jou', sleeping: 'Rust', locked: 'Vergrendeld' };
const teamByCenter: Record<string, { manager: string; role: string; color: string; people: Array<[string, string, string]> }> = {
  brainstorm: { manager: 'Mila', role: 'Creatief directeur', color: 'peach', people: [['Mila', 'Manager · richting & reflectie', '✦'], ['Bo', 'Trendonderzoeker', '⌕'], ['Noor', 'Ideeënmaker', '✎'], ['Jules', 'Publieksstrateeg', '◉']] },
  script: { manager: 'Sam', role: 'Scriptmanager', color: 'lavender', people: [['Sam', 'Manager · verhaal & ontwikkeling', '✦'], ['Yara', 'Hook-specialist', '↗'], ['Finn', 'Scenarist', '✎'], ['Mika', 'Factchecker', '✓']] },
  production: { manager: 'Alex', role: 'Productiemanager', color: 'blue', people: [['Alex', 'Manager · beeld & eindmontage', '✦'], ['Lou', 'Storyboardmaker', '▤'], ['Pip', 'Editor', '▶'], ['Ravi', 'Kwaliteitscheck', '◉']] },
  analytics: { manager: 'Robin', role: 'Analysem manager', color: 'mint', people: [['Robin', 'Manager · leren & verbeteren', '✦'], ['Evi', 'Data-analist', '▥'], ['Max', 'Retentiespecialist', '⌁'], ['Zoe', 'Experimentontwerper', '⌘']] },
  default: { manager: 'Nova', role: 'Labmanager', color: 'mint', people: [['Nova', 'Manager · ontwikkeling & reflectie', '✦'], ['Bo', 'Onderzoeker', '⌕'], ['Noor', 'Maker', '✎'], ['Jules', 'Kwaliteitscheck', '✓']] }
};
const demoVideos = [
  ['Waarom je brein dit geluid niet vergeet', '24,8K', '78%', '1.842', '€ 18,42', '+24%'],
  ['De 3-secondenregel voor focus', '18,2K', '71%', '1.206', '€ 13,76', '+12%'],
  ['Dit gebeurt er als je 30 dagen volhoudt', '12,6K', '64%', '874', '€ 9,30', '+8%']
];

function Island({ center, position, index, onClick, onHover }: { center: Center; position: [number, number, number]; index: number; onClick: () => void; onHover: (active: boolean) => void }) {
  const [hot, setHot] = useState(false);
  const color = colors[center.status] ?? '#35bd90';
  return <group position={position}>
    <Float speed={center.status === 'waiting' ? 1.6 : .7} floatIntensity={.08}>
      <group scale={hot ? 1.1 : 1} onClick={onClick} onPointerOver={() => { setHot(true); onHover(true); }} onPointerOut={() => { setHot(false); onHover(false); }}>
        <mesh position={[0, -.16, 0]} castShadow receiveShadow><cylinderGeometry args={[1.08, .9, .34, 10]} /><meshStandardMaterial color="#c8b692" roughness={.95} /></mesh>
        <mesh position={[0, .03, 0]} receiveShadow><cylinderGeometry args={[1.06, 1.04, .15, 10]} /><meshStandardMaterial color={hot ? '#a0c88b' : '#6f9f78'} roughness={1} /></mesh>
        <mesh position={[0, .19, 0]} castShadow>{index % 3 === 0 ? <cylinderGeometry args={[.48, .59, .28, 12]} /> : index % 3 === 1 ? <boxGeometry args={[.95, .22, .78]} /> : <cylinderGeometry args={[.56, .62, .23, 8]} />}<meshStandardMaterial color="#e7ece8" roughness={.4} /></mesh>
        <mesh position={[0, .39, 0]} castShadow>{index % 3 === 0 ? <sphereGeometry args={[.34, 16, 10]} /> : <cylinderGeometry args={[.36, .36, .28, 16]} />}<meshStandardMaterial color={index % 3 === 0 ? '#95d2d1' : '#d5e8e5'} metalness={.13} roughness={.22} /></mesh>
        <mesh position={[0, .55, 0]}><cylinderGeometry args={[.2, .2, .025, 20]} /><meshStandardMaterial color="#75c7c6" emissive="#39a8a9" emissiveIntensity={.22} /></mesh>
        {[[.7, -.35], [-.7, -.34], [.7, .4], [-.7, .38]].map(([x, z], i) => <group key={i} position={[x, .2, z]}><mesh position={[0, .12, 0]}><cylinderGeometry args={[.025, .04, .2, 5]} /><meshStandardMaterial color="#826248" /></mesh><mesh position={[0, .28, 0]}><coneGeometry args={[.12, .27, 6]} /><meshStandardMaterial color={i % 2 ? '#408262' : '#578f68'} /></mesh></group>)}
        <mesh position={[.67, .51, .18]}><sphereGeometry args={[.12, 12, 12]} /><meshBasicMaterial color={color} /></mesh>
        <Text position={[0, -.56, 0]} fontSize={.16} maxWidth={2.15} textAlign="center" anchorX="center" color="#143e49" outlineWidth={.014} outlineColor="#ddf1ee">{center.name.replace(' Station', '').replace(' Lab', '').replace(' Dock', '').replace(' Toren', '').replace(' Centrum', '')}</Text>
        <Text position={[-.54, .77, .15]} fontSize={.12} color="#286a69" outlineWidth={.022} outlineColor="white">{String(index + 1).padStart(2, '0')}</Text>
        <Text position={[.5, .77, .15]} fontSize={.12} color={center.status === 'waiting' ? '#d87822' : '#177b63'} outlineWidth={.022} outlineColor="white">●</Text>
      </group>
    </Float>
  </group>;
}

const centerDescriptions: Record<string, string> = {
  brainstorm: 'Verzamel onderwerpen, ontdek trends en kies welk idee verder gaat.',
  strategy: 'Bepaal je doelgroep, doelen en publicatieplanning voor de komende periode.',
  script: 'Werk een idee uit tot een shortscript met hook, scènes en oproep.',
  production: 'Maak van een goedgekeurd script een storyboard en controleer de video.',
  publishing: 'Bereid je video voor op publicatie en beheer de kanaalversies.',
  analytics: 'Bekijk welke video’s goed presteren en vertaal cijfers naar verbeteringen.',
  growth: 'Test manieren om bereik, kijkers en terugkerend publiek te vergroten.',
  expansion: 'Ontwikkel nieuwe formats en breid je kanaalstrategie uit.'
};
const islandPositions: Array<[number, number, number]> = [[-4, 0, -2.8], [-1.35, 0, -3.45], [1.35, 0, -3.45], [4, 0, -2.8], [4, 0, 1.45], [1.35, 0, 3.45], [-1.35, 0, 3.45], [-4, 0, 1.45]];
function WorldMap({ centers, onSelect }: { centers: Center[]; onSelect: (c: Center) => void }) {
  const [hovered, setHovered] = useState<Center | null>(null);
  return <div className="arena island-map"><Canvas camera={{ position: [0, 8.6, 9.6], fov: 38 }} shadows>
    <color attach="background" args={['#b6dce7']} /><fog attach="fog" args={['#b6dce7', 16, 27]} />
    <ambientLight intensity={1.45} /><directionalLight position={[-5, 9, 5]} intensity={2.1} castShadow />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.52, 0]} receiveShadow><circleGeometry args={[10, 72]} /><meshStandardMaterial color="#58aab7" roughness={.33} /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.49 + i * .003, 0]}><ringGeometry args={[2.7 + i * 1.17, 2.73 + i * 1.17, 80]} /><meshBasicMaterial color={i % 2 ? '#b3e6df' : '#8cd5d2'} transparent opacity={.35} /></mesh>)}
    {centers.slice(0, -1).map((center, i) => { const start = islandPositions[i] ?? [0, 0, 0]; const end = islandPositions[i + 1] ?? [0, 0, 0]; const marker = [start[0] * .45 + end[0] * .55, -.22, start[2] * .45 + end[2] * .55] as [number, number, number]; return <group key={'route-' + center.id}><Line points={[[start[0], -.38, start[2]], [end[0], -.38, end[2]]]} color="#e8d27f" lineWidth={2.5} transparent opacity={.85} /><mesh position={marker} rotation={[Math.PI / 2, Math.atan2(end[0] - start[0], end[2] - start[2]), 0]}><coneGeometry args={[.12, .28, 3]} /><meshBasicMaterial color="#f3d97c" /></mesh></group>; })}
    {centers.map((c, i) => <Island key={c.id} center={c} index={i} position={islandPositions[i] ?? [0, 0, 0]} onClick={() => onSelect(c)} onHover={active => setHovered(active ? c : current => current?.id === c.id ? null : current)} />)}
    <OrbitControls enablePan={false} minPolarAngle={.68} maxPolarAngle={1.24} minDistance={7.5} maxDistance={15} />
  </Canvas><div className="map-overlay"><span>◈ JOUW SHORTS-ARCHIPEL</span><small>Gouden routepijlen tonen de procesvolgorde · klik op een eiland om het lab binnen te gaan</small></div>
  {hovered && <div className="island-hover-card" aria-live="polite"><span className="island-hover-kicker">CENTRUM · {statusNames[hovered.status] ?? hovered.status}</span><b>{hovered.name}</b><p>{centerDescriptions[hovered.id] ?? 'Open dit lab om de volgende processtap uit te voeren.'}</p><small><strong>Nu:</strong> {hovered.detail}{hovered.tasks[0] ? ` · ${hovered.tasks[0]}` : ''}</small><span className="island-hover-hint">Klik om het centrum te openen ↗</span></div>}
  </div>;
}

function App() {
  const qc = useQueryClient();
  const [login, setLogin] = useState(false);
  const { data, error } = useQuery<State>({ queryKey: ['state'], queryFn: () => api('/api/state'), refetchInterval: 10000, retry: false });
  const [page, setPage] = useState<Page>('world');
  const [selected, setSelected] = useState<Center | null>(null);
  const [labTab, setLabTab] = useState<LabTab>('overview');
  const [chats, setChats] = useState<Record<string, ChatLine[]>>({});
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState('');
  const [cooOpen, setCooOpen] = useState(false);
  const [range, setRange] = useState('28 dagen');
  const [filter, setFilter] = useState('Alle video’s');
  const pending = useMemo(() => data?.approvals.filter(a => a.status === 'pending') ?? [], [data]);

  useEffect(() => { if (error instanceof Error && error.message === 'LOGIN_REQUIRED') setLogin(true); }, [error]);
  useEffect(() => { if (login) return; const es = new EventSource((import.meta.env.VITE_API_URL ?? '') + '/api/events'); es.onmessage = () => qc.invalidateQueries({ queryKey: ['state'] }); return () => es.close(); }, [qc, login]);

  const doApproval = async (id: string, decision: 'approve' | 'change', change?: string) => {
    try { await api('/api/approvals/' + id, { method: 'POST', body: JSON.stringify({ decision, change }) }); await qc.invalidateQueries({ queryKey: ['state'] }); setToast('Akkoord verwerkt. Het lab gaat verder.'); }
    catch (e) { setToast((e as Error).message); }
  };
  const startLab = async (center: Center) => {
    try { await api('/api/workflow/start', { method: 'POST', body: JSON.stringify({ center: center.id, approvedInput: center.id === 'brainstorm' }) }); await qc.invalidateQueries({ queryKey: ['state'] }); setToast('Nieuwe labrun gestart.'); }
    catch (e) { setToast((e as Error).message); }
  };
  const sendMessage = (text: string) => {
    if (!selected || !text.trim()) return;
    const id = selected.id;
    setChats(prev => ({ ...prev, [id]: [...(prev[id] ?? []), { by: 'you', text: text.trim() }] }));
    setDraft('');
    const team = teamByCenter[id] ?? teamByCenter.default;
    const reply = text.toLowerCase().includes('reflect') ? 'Laten we terugkijken: wat werkte goed, wat verraste je en wat wil je de volgende keer anders proberen? Ik neem jouw antwoord mee in de volgende cyclus.' : text.toLowerCase().includes('ontwikkel') ? 'Mooi ontwikkelpunt. Ik zet dit om in een klein experiment voor de volgende cyclus en bespreek met het team hoe we het resultaat meten.' : 'Ik neem dit mee in de briefing en stem het af met het team. Wil je dat we dit als vaste voorkeur onthouden, of alleen voor deze Short toepassen?';
    window.setTimeout(() => setChats(prev => ({ ...prev, [id]: [...(prev[id] ?? []), { by: 'manager', text: reply }] })), 450);
    void team;
  };

  if (error && !(error instanceof Error && error.message === 'LOGIN_REQUIRED')) return <main className="error">API niet bereikbaar. Start de API met <code>npm run dev</code>.</main>;
  if (!data) return <main className="loading">{login ? 'Log in om jouw eilandwereld te openen…' : 'Jouw eilandwereld laden…'}{login && <LoginCard onSuccess={() => { setLogin(false); void qc.invalidateQueries({ queryKey: ['state'] }); }} setToast={setToast} />}</main>;

  const nav: Array<[Page, string, string]> = [['world', '◈', 'Eilandwereld'], ['dashboard', '▦', 'Dashboard'], ['analytics', '↗', 'Videoanalyse'], ['workflow', '☷', 'Workflow']];
  const heading: Record<Page, string> = { world: 'Jouw eilandwereld', dashboard: 'Dashboard', analytics: 'Videoanalyse', workflow: 'Workflow' };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon">✦</span><div><b>SHORT LAB</b><small>TAHARS VIDEOLAB</small></div></div>
      <nav className="main-nav">{nav.map(([id, icon, name]) => <button key={id} className={page === id ? 'nav-selected' : ''} onClick={() => { setPage(id); setSelected(null); }}><span>{icon}</span>{name}</button>)}</nav>
      <button className="coo-open" onClick={() => setCooOpen(true)}><span>◈</span><b>COO</b><small>Hoofdoperator</small></button><span className="mock-pill"><i /> VOORBEELDDATA</span><button className="avatar" onClick={() => setLogin(true)}>T</button></header>

    <div className="cycle-row"><div><span className="eyebrow">WERELD 01 · YOUTUBE SHORTS</span><h1>{heading[page]}</h1></div><div className="cycle-pill">CYCLUS {data.cycle} <b>·</b> DAG {data.day}<span className="muted">/{data.days}</span></div></div>

    {page === 'world' && <><section className="main-grid"><div className="scene-wrap"><WorldMap centers={data.centers} onSelect={c => { setSelected(c); setLabTab('overview'); }} /><div className="scene-label"><i className="live-dot" /> INTERACTIEVE LABWERELD · {data.centers.length} EILANDEN</div></div><aside className="side-panel"><div className="panel-head"><div><span className="eyebrow">WERELDSTATUS</span><h2>Vandaag</h2></div><span className="sun">☀</span></div><div className="report-row"><span>Actieve labs</span><b>{data.centers.filter(c => c.status === 'running').length} / {data.centers.length}</b></div><div className="report-row"><span>Wacht op akkoord</span><b className="orange">{pending.length} kaarten</b></div><div className="report-row"><span>Deze cyclus klaar</span><b>{data.published}/{data.goal} Shorts</b></div><div className="next-action"><span>VOLGENDE STAP</span><b>{pending[0]?.task ?? 'Open een lab en start een nieuwe run'}</b><small>{pending[0] ? 'Een team wacht op jouw besluit.' : 'Kies een eiland om binnen te gaan.'}</small><button onClick={() => pending[0] ? (setSelected(data.centers.find(c => c.id === pending[0].center) ?? data.centers[0]), setLabTab('team')) : setSelected(data.centers[0])}>Ga naar eiland <span>→</span></button></div><div className="trofee"><div className="trofee-head"><b>🏆 TROFEEËNPAD</b><span>{data.published}/{data.goal}</span></div><div className="progress"><i style={{ width: Math.min(100, data.published / data.goal * 100) + '%' }} /></div><small>Op weg naar je volgende mijlpaal</small></div></aside></section><section className="cards-section island-list"><div className="section-title"><span>JOUW EILANDEN</span><small>Klik op een lab om het te openen</small></div><div className="cards">{data.centers.map((c, i) => <button key={c.id} className="island-card" onClick={() => { setSelected(c); setLabTab('overview'); }}><span className={'island-chip chip-' + (i % 4)}>{['✎', '✦', '▶', '◉'][i % 4]}</span><span className="island-card-copy"><b>{c.name}</b><small>{c.detail}</small></span><span className="island-card-status" style={{ color: colors[c.status] }}>{statusNames[c.status] ?? c.status}</span><span className="island-open">↗</span></button>)}</div></section></>}

    {page === 'dashboard' && <section className="data-page"><div className="demo-banner"><span>ⓘ</span><div><b>Voorbeelddata in mockmodus</b><small>Fictieve kanaalcijfers. Echte YouTube-statistieken verschijnen na het koppelen van je kanaal.</small></div><button onClick={() => setToast('YouTube-koppeling komt in een volgende fase.')}>YouTube koppelen →</button></div>
      <div className="metric-grid"><Metric icon="◉" title="Weergaven" value="55,6K" note="↑ 18,4% t.o.v. vorige periode" /><Metric icon="€" title="Geschatte omzet" value="€ 41,48" note="YouTube · voorbeeldcijfers" color="gold" /><Metric icon="♧" title="Abonnees erbij" value="+384" note="↑ 12,1% t.o.v. vorige periode" color="purple" /><Metric icon="▶" title="Gepubliceerde Shorts" value={String(data.published + 12)} note="3 deze week" color="blue" /></div>
      <div className="data-columns"><article className="surface-card chart-card"><CardHeading eyebrow="KANAALPRESTATIES" title="Weergaven & kijktijd"><select value={range} onChange={e => setRange(e.target.value)}><option>28 dagen</option><option>7 dagen</option><option>90 dagen</option></select></CardHeading><Chart /><div className="chart-legend"><span><i /> Weergaven</span><span><i className="purple-key" /> Kijktijd</span><small>Dagtotalen · mockdata</small></div></article><article className="surface-card revenue-card"><CardHeading eyebrow="OMZET" title="Inkomstenbronnen"><span className="euro-badge">€</span></CardHeading><b className="revenue-value">€ 41,48 <small>deze maand</small></b><Revenue label="Shorts-advertenties" value="€ 32,60" /><Revenue label="YouTube Premium" value="€ 8,88" purple /><p className="data-disclaimer">Omzet wordt pas echt inzichtelijk nadat YouTube Analytics is gekoppeld.</p></article></div>
      <div className="data-columns lower-columns"><article className="surface-card"><CardHeading eyebrow="BESTE CONTENT" title="Top Shorts deze periode"><button className="inline-link" onClick={() => setPage('analytics')}>Bekijk analyse →</button></CardHeading><VideoTable compact /></article><article className="surface-card"><CardHeading eyebrow="FOCUS VOOR VANDAAG" title="Wat vraagt aandacht?"><span className="weather">✦</span></CardHeading><div className="focus-row"><b>{pending.length}</b><span><strong>kaarten wachten op akkoord</strong><small>Geef je labs input om verder te gaan.</small></span></div><div className="focus-row"><b>{data.centers.filter(c => c.status === 'running').length}</b><span><strong>labs zijn actief</strong><small>Je teams werken op de achtergrond.</small></span></div><button className="wide-action" onClick={() => setPage('workflow')}>Open workflow →</button></article></div></section>}

    {page === 'analytics' && <section className="data-page"><div className="demo-banner"><span>ⓘ</span><div><b>Voorbeeldanalyse · geen live YouTube-data</b><small>Koppel je kanaal om werkelijke views, kijktijd, engagement en omzet per Short te zien.</small></div><button onClick={() => setToast('YouTube-koppeling komt in een volgende fase.')}>Kanaal koppelen →</button></div><div className="analytics-toolbar"><div className="filter-tabs">{['Alle video’s', 'Best scorend', 'Groei'].map(f => <button className={filter === f ? 'filter-active' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>)}</div><select value={range} onChange={e => setRange(e.target.value)}><option>28 dagen</option><option>7 dagen</option><option>90 dagen</option></select></div><div className="metric-grid"><Metric icon="◉" title="Gem. views per Short" value="18,5K" note="↑ 14%" /><Metric icon="◷" title="Gem. bekeken" value="71,0%" note="Sterke retentie" color="gold" /><Metric icon="♡" title="Engagement rate" value="8,2%" note="Likes + reacties + shares" color="purple" /><Metric icon="↗" title="Groei" value="+22%" note="T.o.v. vorige periode" color="blue" /></div><article className="surface-card ranking-card"><CardHeading eyebrow="VIDEO-PRESTATIES" title={filter === 'Groei' ? 'Snelste groeiers' : 'Welke Shorts scoren het best?'}><span className="sort-note">Gesorteerd op views ↓</span></CardHeading><VideoTable /></article><div className="insight-row"><article className="surface-card insight"><span>✦</span><div><small>INZICHT</small><b>De eerste 3 seconden houden kijkers vast</b><p>Shorts met een directe vraag starten beter in deze voorbeelddataset.</p></div></article><article className="surface-card insight"><span className="purple-insight">◷</span><div><small>PUBLICATIETIJD</small><b>Donderdag rond 18:00</b><p>In dit voorbeeld is je publiek dan het meest actief.</p></div></article></div></section>}

    {page === 'workflow' && <section className="data-page workflow-page"><div className="demo-banner"><span>✦</span><div><b>Alle labs werken samen, jij houdt de regie</b><small>Open een eiland voor de manager, medewerkers, processtappen en open besluiten.</small></div></div><div className="workflow-labs">{data.centers.map((c, i) => <button key={c.id} className="workflow-row" onClick={() => { setSelected(c); setLabTab('team'); }}><span className={'island-chip chip-' + (i % 4)}>{['✎', '✦', '▶', '◉'][i % 4]}</span><span><b>{c.name}</b><small>{teamByCenter[c.id]?.manager ?? teamByCenter.default.manager} · {c.detail}</small></span><i style={{ background: colors[c.status] }} />{statusNames[c.status] ?? c.status}<span className="island-open">↗</span></button>)}</div><div className="data-columns"><article className="surface-card"><CardHeading eyebrow="WACHT OP JOU" title="Akkoordkaarten"><span className="pending-pill">{pending.length}</span></CardHeading>{pending.length ? pending.map(a => <div className="approval-row" key={a.id}><span>✦</span><div><b>{a.task}</b><small>{data.centers.find(c => c.id === a.center)?.name} · circa {a.minutes} min</small></div><button onClick={() => { setSelected(data.centers.find(c => c.id === a.center) ?? null); setLabTab('overview'); }}>Open →</button></div>) : <p className="empty-state">Alles bijgewerkt. De teams werken verder.</p>}</article><article className="surface-card"><CardHeading eyebrow="RECENT" title="Activiteit" />{data.events.slice(-5).reverse().map((e, i) => <div className="event-row" key={i}><i /><span><b>{e.message}</b><small>{e.center}</small></span></div>)}</article></div></section>}

    <footer>MADE FOR TAHAR <span>✦</span> FASE 1 · MOCK CLOUD DEMO</footer>

    {selected && <LabRoom center={selected} state={data} tab={labTab} setTab={setLabTab} chat={chats[selected.id] ?? []} draft={draft} setDraft={setDraft} sendMessage={sendMessage} onClose={() => setSelected(null)} onApproval={doApproval} onStart={() => void startLab(selected)} />}
    {cooOpen && <ChiefOperator state={data} onClose={() => setCooOpen(false)} onOpenCenter={(center, tab) => { setSelected(center); setLabTab(tab); setCooOpen(false); }} />}
    {toast && <div className="toast" onClick={() => setToast('')}>{toast}<button>×</button></div>}
    {login && <div className="modal-backdrop" onClick={() => setLogin(false)}><LoginCard onSuccess={() => { setLogin(false); setToast('Ingelogd als Tahar.'); void qc.invalidateQueries({ queryKey: ['state'] }); }} setToast={setToast} /></div>}
  </main>;
}

function ChiefOperator({ state, onClose, onOpenCenter }: { state: State; onClose: () => void; onOpenCenter: (center: Center, tab: LabTab) => void }) {
  const [lines, setLines] = useState<OperatorLine[]>([{ by: 'coo', text: 'Hoi, ik ben de hoofdoperator van je Shorts-wereld. Ik houd de eilandstatussen en openstaande besluiten bij. Stel gerust een vraag; ik wijs je naar het juiste team en kan het centrum voor je openen.' }]);
  const [draft, setDraft] = useState('');
  const pending = state.approvals.filter(a => a.status === 'pending');
  const answer = (question: string) => {
    const q = question.toLowerCase();
    const keywords: Record<string, string[]> = { brainstorm: ['idee', 'brainstorm', 'trend', 'onderwerp'], strategy: ['strategie', 'planning', 'kalender', 'doelgroep'], script: ['script', 'hook', 'schrijven'], production: ['video', 'productie', 'runway', 'montage'], publishing: ['publiceer', 'publicatie', 'upload', 'plaatsen'], analytics: ['analyse', 'views', 'weergaven', 'omzet', 'prestat'], growth: ['groei', 'bereik', 'abonnees'], expansion: ['uitbreid', 'format'] };
    let target = state.centers.find(c => q.includes(c.name.toLowerCase()) || q.includes(c.id));
    if (!target) target = state.centers.find(c => keywords[c.id]?.some(word => q.includes(word)));
    if (/overzicht|status|hoe gaat|wat speelt|aandacht/.test(q)) {
      const active = state.centers.filter(c => c.status === 'running').length;
      const focus = pending[0];
      const focusCenter = focus && state.centers.find(c => c.id === focus.center);
      return { text: `Er zijn ${active} actieve labs en ${pending.length} besluiten die op jou wachten. ${focus ? `De eerstvolgende stap is “${focus.task}” in ${focusCenter?.name ?? 'een centrum'}.` : 'Er staat geen akkoord open; je kunt een lab starten of een volgend idee uitwerken.'}`, center: focusCenter, tab: focus ? 'overview' as LabTab : undefined };
    }
    if (/vast|probleem|blokk|hulp|oplos|akkoord|wacht/.test(q) && pending.length) {
      const approval = pending.find(item => !target || item.center === target.id) ?? pending[0];
      const approvalCenter = state.centers.find(c => c.id === approval.center);
      return { text: `Ik zie een open besluit: “${approval.task}”. Open het centrum om akkoord te geven of een wijziging terug te sturen.`, center: approvalCenter, tab: 'overview' as LabTab };
    }
    if (!target) target = state.centers.find(c => c.status === 'waiting') ?? state.centers[0];
    const task = target.tasks[0] ? ` De huidige taak is “${target.tasks[0]}”.` : '';
    const next = target.status === 'waiting' ? ' Dit centrum wacht op jouw input.' : target.status === 'locked' ? ' Dit centrum is nog vergrendeld.' : ' In het centrum vind je de manager, medewerkers en processtappen.';
    return { text: `${target.name} is het juiste eiland voor dit onderwerp.${task}${next} Open het centrum om de manager te spreken of een open stap af te handelen.`, center: target, tab: 'overview' as LabTab };
  };
  const send = (value: string) => { const question = value.trim(); if (!question) return; const response = answer(question); setLines(current => [...current, { by: 'you', text: question }, { by: 'coo', ...response }]); setDraft(''); };
  return <div className="coo-backdrop" onClick={onClose}><section className="coo-panel" onClick={event => event.stopPropagation()}>
    <header className="coo-header"><div className="coo-symbol">◈</div><div><span className="eyebrow">OVERKOEPELEND MANAGEMENT</span><h2>Hoofdoperator · COO</h2><small>Coördineert alle eilanden en helpt blokkades te routeren</small></div><button className="close" onClick={onClose}>×</button></header>
    <div className="coo-summary"><span><b>{state.centers.filter(c => c.status === 'running').length}</b> actieve labs</span><span><b>{pending.length}</b> open besluiten</span><small>Wereldstatus · {state.centers.length} centra</small></div>
    <div className="coo-messages">{lines.map((line, i) => <article className={'coo-line ' + (line.by === 'you' ? 'coo-from-you' : '')} key={i}><span>{line.by === 'coo' ? 'COO' : 'Jij'}</span><p>{line.text}{line.center && <button onClick={() => onOpenCenter(line.center!, line.tab ?? 'overview')}>Open {line.center.name} →</button>}</p></article>)}</div>
    <div className="coo-prompts"><button onClick={() => send('Geef me een overzicht: wat vraagt nu aandacht?')}>Wat vraagt aandacht?</button><button onClick={() => send('Help me met een open besluit')}>Help met een blokkade</button><button onClick={() => send('Hoe staat het met de videoscripts?')}>Waar staat het script?</button></div>
    <form className="coo-compose" onSubmit={event => { event.preventDefault(); send(draft); }}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Stel een vraag over alle eilanden…" /><button disabled={!draft.trim()}>Vraag COO ↑</button></form>
    <small className="coo-note">COO reageert op de huidige app-status en voorbeelddata. Echte AI-coördinatie is nog niet gekoppeld.</small>
  </section></div>;
}

function LoginCard({ onSuccess, setToast }: { onSuccess: () => void; setToast: (message: string) => void }) {
  return <section className="login" onClick={e => e.stopPropagation()}><button className="close" onClick={onSuccess}>×</button><span className="eyebrow">TAHAR’S LAB</span><h2>Welkom terug</h2><form onSubmit={e => { e.preventDefault(); const password = new FormData(e.currentTarget).get('password'); void api('/api/login', { method: 'POST', body: JSON.stringify({ password }) }).then(onSuccess).catch(x => setToast((x as Error).message)); }}><input name="password" type="password" placeholder="Wachtwoord" autoFocus /><button className="button-primary">Inloggen →</button></form><small>Lokale demo: tahar-demo</small></section>;
}
function Metric({ icon, title, value, note, color = '' }: { icon: string; title: string; value: string; note: string; color?: string }) { return <article className="metric-card"><span className={'metric-icon ' + color}>{icon}</span><div><small>{title}</small><b>{value}</b><em>{note}</em></div></article>; }
function CardHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) { return <div className="card-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{children}</div>; }
function Chart() { return <div className="chart"><div className="chart-axis"><span>30K</span><span>20K</span><span>10K</span><span>0</span></div><svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-label="Voorbeeldgrafiek weergaven"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#24b7a1" stopOpacity=".28" /><stop offset="1" stopColor="#24b7a1" stopOpacity="0" /></linearGradient></defs>{[20, 72, 124, 176].map(y => <line key={y} x1="0" x2="700" y1={y} y2={y} className="gridline" />)}<path d="M0 165 C38 156 55 131 90 139 S145 151 178 111 S220 125 260 102 S315 113 350 80 S405 105 438 72 S492 92 526 54 S580 71 614 43 S665 61 700 18 L700 190 L0 190Z" fill="url(#fill)" /><path d="M0 165 C38 156 55 131 90 139 S145 151 178 111 S220 125 260 102 S315 113 350 80 S405 105 438 72 S492 92 526 54 S580 71 614 43 S665 61 700 18" fill="none" stroke="#20b99f" strokeWidth="3" vectorEffect="non-scaling-stroke" /><path d="M0 179 C44 171 61 165 96 166 S147 169 180 157 S229 163 265 147 S316 155 351 137 S406 143 440 127 S490 140 528 115 S579 126 615 109 S668 116 700 99" fill="none" stroke="#8171d8" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-dates"><span>1 okt</span><span>5 okt</span><span>10 okt</span><span>15 okt</span><span>20 okt</span><span>25 okt</span><span>31 okt</span></div></div>; }
function Revenue({ label, value, purple = false }: { label: string; value: string; purple?: boolean }) { return <div className="revenue-row"><span><i className={purple ? 'revenue-dot purple-dot' : 'revenue-dot'} />{label}</span><b>{value}</b></div>; }
function VideoTable({ compact = false }: { compact?: boolean }) { return <div className={'video-table ' + (compact ? 'compact-table' : '')}><div className="video-tr table-head"><span>VIDEO</span><span>WEERGAVEN</span><span>GEM. BEKEKEN</span><span>LIKES</span><span>OMZET</span><span>TREND</span></div>{demoVideos.map((v, i) => <div className="video-tr" key={v[0]}><b className="video-name"><span className={'video-thumb thumb-' + i}>▶</span>{v[0]}</b><b>{v[1]}</b><span><i className="retention"><em style={{ width: v[2] }} /></i>{v[2]}</span><span>{v[3]}</span><b>{v[4]}</b><strong className="trend-up">↗ {v[5]}</strong></div>)}</div>; }

function LabRoom({ center, state, tab, setTab, chat, draft, setDraft, sendMessage, onClose, onApproval, onStart }: { center: Center; state: State; tab: LabTab; setTab: (t: LabTab) => void; chat: ChatLine[]; draft: string; setDraft: (s: string) => void; sendMessage: (text: string) => void; onClose: () => void; onApproval: (id: string, d: 'approve' | 'change', c?: string) => Promise<void>; onStart: () => void }) {
  const team = teamByCenter[center.id] ?? teamByCenter.default;
  const approvals = state.approvals.filter(a => a.center === center.id && a.status === 'pending');
  const events = state.events.filter(e => e.center === center.id).slice(-6).reverse();
  const submit = (e: FormEvent) => { e.preventDefault(); sendMessage(draft); };
  const tabs: Array<[LabTab, string]> = [['overview', 'Overzicht'], ['team', 'Team & stappen'], ['chat', 'Praat met ' + team.manager], ['reflection', 'Ontwikkeling & reflectie']];
  if (center.id === 'script') tabs.push(['studio', 'AI Scriptstudio']);
  return <div className="lab-backdrop" onClick={onClose}><section className="lab-room" onClick={e => e.stopPropagation()}>
    <header className="lab-room-head"><button onClick={onClose}>← Terug naar eilandwereld</button><span className="lab-room-world">WERELD 01 · YOUTUBE SHORTS</span><span className="lab-room-status" style={{ color: colors[center.status] }}>● {statusNames[center.status] ?? center.status}</span></header>
    <div className="lab-room-banner"><div className="lab-art"><span>✦</span><small>LAB {String(state.centers.findIndex(c => c.id === center.id) + 1).padStart(2, '0')}</small></div><div className="lab-room-title"><span className="eyebrow">{center.detail}</span><h2>{center.name}</h2><p>Manager {team.manager} · {team.role}</p></div>{center.id === 'script' && <button className="lab-primary studio-shortcut" onClick={() => setTab('studio')}>✎ Open Scriptstudio</button>}<button className="lab-primary" onClick={onStart}>＋ Start nieuwe labrun</button></div>
    <nav className="lab-room-tabs">{tabs.map(([id, name]) => <button className={tab === id ? 'lab-tab-active' : ''} key={id} onClick={() => setTab(id)}>{name}</button>)}</nav>
    <div className="lab-room-content">
      {tab === 'overview' && <><div className="lab-summary"><article><span className="eyebrow">MANAGER</span><b>{team.manager}</b><small>{team.role}</small></article><article><span className="eyebrow">TEAM</span><b>{team.people.length} medewerkers</b><small>Eigen taken per processtap</small></article><article><span className="eyebrow">WACHT OP JOU</span><b>{approvals.length} besluiten</b><small>Jij houdt de eindregie</small></article></div><div className="lab-content-columns"><article className="lab-pane"><CardHeading eyebrow="WERK IN UITVOERING" title="Processtappen" /><StepList center={center} /></article><article className="lab-pane manager-card"><span className="manager-avatar">{team.people[0][2]}</span><span className="eyebrow">JOUW MANAGER</span><h3>{team.manager}</h3><p>Praat met mij over de richting van dit lab, wat je wilt ontwikkelen of wat we kunnen leren van de laatste cyclus.</p><button className="wide-action" onClick={() => setTab('chat')}>Open gesprek →</button></article></div></>}
      {tab === 'team' && <div className="lab-content-columns"><article className="lab-pane"><CardHeading eyebrow="JOUW TEAM" title="Manager & medewerkers" />{team.people.map((p, i) => <div className="staff-row" key={p[0]}><span className={'staff-avatar staff-' + i}>{p[2]}</span><span><b>{p[0]}</b><small>{p[1]}</small></span>{i === 0 && <em>MANAGER</em>}</div>)}</article><article className="lab-pane"><CardHeading eyebrow="PROCES" title="Wie doet wat?" /><StepList center={center} /></article></div>}
      {tab === 'chat' && <div className="chat-layout"><article className="chat-card"><div className="chat-header"><span className="manager-avatar">{team.people[0][2]}</span><span><b>{team.manager}</b><small>{team.role} · mockmanager</small></span><i>● Online</i></div><div className="chat-messages"><div className="chat-line manager-line"><span>{team.manager.slice(0, 1)}</span><p>Hoi! Ik ben {team.manager}, jouw manager van {center.name}. Waar wil je samen naar kijken?</p></div>{chat.map((m, i) => <div className={'chat-line ' + (m.by === 'you' ? 'you-line' : 'manager-line')} key={i}>{m.by === 'manager' && <span>{team.manager.slice(0, 1)}</span>}<p>{m.text}</p></div>)}</div><form className="chat-compose" onSubmit={submit}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Bespreek een idee, vraag of feedback…" /><button disabled={!draft.trim()}>Verstuur ↑</button></form><small className="mock-note">Mockgesprek · gesprekken worden nog niet opgeslagen en sturen nog geen echte AI-opdracht.</small></article><aside className="chat-prompts"><span className="eyebrow">GESPREKSSTARTERS</span><button onClick={() => sendMessage('Ik wil dit lab verder ontwikkelen. Welke kleine verbetering raad je aan?')}>✦ <span><b>Ontwikkeling</b><small>Wat kan dit lab verbeteren?</small></span></button><button onClick={() => sendMessage('Laten we reflecteren op de vorige cyclus. Wat kunnen we leren?')}>◷ <span><b>Reflectie</b><small>Wat werkte en wat leren we?</small></span></button><button onClick={() => sendMessage('Ik heb een nieuw idee voor de volgende video.')}>✎ <span><b>Nieuw idee</b><small>Leg een idee voor aan je manager.</small></span></button></aside></div>}
      {tab === 'reflection' && <div className="lab-content-columns"><article className="lab-pane reflection-pane"><span className="eyebrow">CYCLUS {state.cycle} · DAG {state.day}</span><h3>Ontwikkelen door terug te kijken</h3><p>Bespreek met {team.manager} wat goed ging, wat je wilt verbeteren en welk experiment het team in de volgende cyclus kan uitvoeren.</p><div className="reflection-prompts"><button onClick={() => { setTab('chat'); sendMessage('Laten we reflecteren op de vorige cyclus. Wat werkte goed en wat kunnen we leren?'); }}>◷ Reflecteer op de vorige cyclus <span>→</span></button><button onClick={() => { setTab('chat'); sendMessage('Ik wil dit lab verder ontwikkelen. Stel een concreet experiment voor.'); }}>✦ Kies een ontwikkelpunt <span>→</span></button><button onClick={() => { setTab('chat'); sendMessage('Welke processtap levert nu de meeste waarde op en waarom?'); }}>⌁ Bespreek de processtappen <span>→</span></button></div><small className="mock-note">Dit zijn mockgesprekken; herinneringen en inzichten worden in deze demo nog niet bewaard.</small></article><article className="lab-pane"><CardHeading eyebrow="RECENTE REFLECTIES" title="Wat we meenemen" />{events.length ? events.map((e, i) => <div className="event-row" key={i}><i /><span><b>{e.message}</b><small>{e.at}</small></span></div>) : <p className="empty-state">Na een workflowstap verschijnt hier de activiteit van dit lab.</p>}</article></div>}
      {tab === 'studio' && center.id === 'script' && <ScriptStudio />}
      {tab === 'overview' && approvals.map(a => <div className="lab-approval" key={a.id}><b>Jouw akkoord nodig · {a.task}</b><p>{a.payload}</p><button onClick={() => void onApproval(a.id, 'approve')}>Akkoord ✓</button><button className="quiet-btn" onClick={() => void onApproval(a.id, 'change', 'Pas dit aan en vraag mij daarna opnieuw om akkoord.')}>Wijziging vragen</button></div>)}
    </div>
  </section></div>;
}
function StepList({ center }: { center: Center }) {
  const team = teamByCenter[center.id] ?? teamByCenter.default;
  const tasks = center.tasks.length ? center.tasks : ['Workflow voorbereiden', 'Kwaliteit controleren', 'Resultaat terugkoppelen'];
  return <div className="step-list">{tasks.map((task, i) => <div className="step-row" key={task}><span className={i === 0 ? 'step-active' : 'step-done'}>{i === 0 ? '◉' : '✓'}</span><div><b>{task}</b><small>{team.people[(i + 1) % team.people.length][0]} · {team.people[(i + 1) % team.people.length][1].split(' · ')[0]}</small></div><span className="step-state">{i === 0 ? 'BEZIG' : 'KLAAR'}</span></div>)}</div>;
}
export default App;
