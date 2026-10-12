import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type TrendItem = { title: string; url?: string; source: string; publishedAt?: string; channel?: string };
type TrendResponse = { searchTrends: TrendItem[]; news: TrendItem[]; youtube: TrendItem[]; youtubeConfigured: boolean; aiConfigured: boolean; fetchedAt: string };
type Answers = { topic: string; audience: string; goal: string; tone: string; duration: string };
type Chat = { by: 'assistant' | 'you'; text: string };
const questions: Array<{ key: keyof Answers; text: string; placeholder: string }> = [
  { key: 'topic', text: 'Waar moet jouw Short over gaan? Kies een trend links of typ je eigen idee.', placeholder: 'Onderwerp of idee…' },
  { key: 'audience', text: 'Voor wie maken we deze Short? Beschrijf je kijker in één zin.', placeholder: 'Bijvoorbeeld: jonge ondernemers die meer focus willen…' },
  { key: 'goal', text: 'Wat wil je dat de kijker na afloop weet, voelt of doet?', placeholder: 'Het doel van deze video…' },
  { key: 'tone', text: 'Welke toon past bij jouw kanaal?', placeholder: 'Bijvoorbeeld: energiek, nieuwsgierig, persoonlijk…' },
  { key: 'duration', text: 'Hoe lang mag de Short ongeveer worden?', placeholder: 'Kies 30, 45 of 60 seconden…' }
];
async function fetchTrends(): Promise<TrendResponse> {
  const response = await fetch('/api/trends', { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Trendbronnen laden niet.');
  return data;
}
async function api(path: string, body: unknown) {
  const response = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Er ging iets mis.');
  return data as { script: string; source: string };
}
export default function ScriptStudio() {
  const { data: trends, isLoading, error } = useQuery({ queryKey: ['script-trends'], queryFn: fetchTrends, staleTime: 5 * 60 * 1000 });
  const [answers, setAnswers] = useState<Answers>({ topic: '', audience: '', goal: '', tone: '', duration: '' });
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Chat[]>([{ by: 'assistant', text: 'Hoi! Ik help je een Short-script maken. Eerst kies ik met jou een onderwerp; daarna stel ik een paar korte vragen.' }]);
  const [script, setScript] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSource, setActiveSource] = useState<'searchTrends' | 'news' | 'youtube'>('searchTrends');
  const [selectedTrend, setSelectedTrend] = useState('');
  const [errorText, setErrorText] = useState('');

  const trendLists: Record<string, TrendItem[]> = {
    searchTrends: trends?.searchTrends ?? [],
    news: trends?.news ?? [],
    youtube: trends?.youtube ?? []
  };
  const selectedTrends = trendLists[activeSource];
  const sourceLabels = { searchTrends: 'Zoektrends', news: 'Nieuws', youtube: 'YouTube' };
  const saveScript = () => {
    if (!script) return;
    try {
      const existing = JSON.parse(localStorage.getItem('shortlab-script-drafts') ?? '[]') as Array<{ title: string; script: string; savedAt: string }>;
      existing.unshift({ title: answers.topic || 'Short-concept', script, savedAt: new Date().toISOString() });
      localStorage.setItem('shortlab-script-drafts', JSON.stringify(existing.slice(0, 20)));
      setSaved(true);
    } catch { setErrorText('Opslaan in deze browser lukte niet. Kopieer het script als back-up.'); }
  };
  const chooseTrend = (item: TrendItem) => {
    setAnswers(prev => ({ ...prev, topic: item.title }));
    setSelectedTrend(item.source + ': ' + item.title);
    setDraft(item.title);
    setErrorText('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    const key = questions[step].key;
    if (key === 'topic' && value !== answers.topic) setSelectedTrend('');
    const trendContext = key === 'topic' && value !== answers.topic ? '' : selectedTrend;
    const nextAnswers = { ...answers, [key]: value };
    const nextMessages = [...messages, { by: 'you' as const, text: value }];
    setAnswers(nextAnswers);
    setDraft('');
    setMessages(nextMessages);
    setErrorText('');
    setSaved(false);
    if (step < questions.length - 1) {
      const next = step + 1;
      setStep(next);
      setMessages([...nextMessages, { by: 'assistant', text: questions[next].text }]);
      return;
    }
    setBusy(true);
    try {
      const result = await api('/api/scripts/generate', { ...nextAnswers, trend: trendContext });
      setScript(result.script);
      setSource(result.source);
      setMessages([...nextMessages, { by: 'assistant', text: result.source === 'openai' ? 'Hier is een eerste scriptversie. Pas gerust regels aan of bespreek een nieuwe invalshoek.' : 'Ik heb een eerste scriptconcept klaargezet. Dit is voorbeeldgeneratie; koppel een AI-provider voor inhoud die echt op jouw antwoorden is afgestemd.' }]);
    } catch (e) { setErrorText((e as Error).message); }
    finally { setBusy(false); }
  };
  const startOver = () => {
    setAnswers({ topic: '', audience: '', goal: '', tone: '', duration: '' });
    setSelectedTrend('');
    setStep(0); setScript(''); setSource(''); setSaved(false); setErrorText('');
    setMessages([{ by: 'assistant', text: 'Laten we een nieuwe Short maken. Waar moet die over gaan?' }]);
  };

  return <section className="script-studio">
    <header className="studio-heading"><div><span className="eyebrow">SCRIPT LAB · IDEE NAAR VERHAAL</span><h3>AI Scriptstudio</h3><p>Ontdek een onderwerp, beantwoord vijf vragen en maak een eerste Shorts-script.</p></div><span className={'studio-mode ' + (trends?.aiConfigured ? 'mode-live' : '')}><i />{trends?.aiConfigured ? 'AI gekoppeld' : 'Voorbeeld-AI'}</span></header>
    <div className="studio-grid">
      <aside className="trend-panel">
        <div className="trend-heading"><div><span className="eyebrow">TREND RADAR</span><b>Waar praat Nederland over?</b></div><span className="trend-pulse">●</span></div>
        <div className="trend-tabs">{(['searchTrends', 'news', 'youtube'] as const).map(k => <button key={k} className={activeSource === k ? 'trend-tab-active' : ''} onClick={() => setActiveSource(k)}>{sourceLabels[k]}</button>)}</div>
        {!trends && isLoading && <p className="trend-empty">Trendbronnen ophalen…</p>}
        {error && <p className="trend-empty">Trendbronnen tijdelijk niet beschikbaar. Je kunt ook zelf een onderwerp typen.</p>}
        {trends && selectedTrends.length === 0 && <div className="trend-empty">{activeSource === 'youtube' && !trends.youtubeConfigured ? <>Voeg later <code>YOUTUBE_DATA_API_KEY</code> toe om populaire video’s uit Nederland te tonen.</> : 'Geen actuele suggesties gevonden. Probeer een andere bron of vul zelf een onderwerp in.'}</div>}
        <div className="trend-list">{selectedTrends.slice(0, 7).map((item, i) => <button key={item.url || item.title + i} className="trend-item" onClick={() => chooseTrend(item)}><span className="trend-rank">{String(i + 1).padStart(2, '0')}</span><span className="trend-copy"><b>{item.title}</b><small>{item.source}{item.channel ? ' · ' + item.channel : ''}</small></span><span className="trend-use">+</span></button>)}</div>
        <small className="trend-foot">Live bronnen zijn inspiratie, geen garantie dat een onderwerp bij jouw kanaal past.</small>
      </aside>
      <div className="studio-chat">
        <div className="studio-chat-top"><span className="studio-avatar">✦</span><span><b>Scriptassistent</b><small>{trends?.aiConfigured ? 'AI-provider verbonden' : 'Demo · AI-provider nog niet ingesteld'}</small></span><span className="question-counter">{script ? 'CONCEPT' : 'VRAAG ' + (step + 1) + ' / ' + questions.length}</span></div>
        <div className="studio-messages">{messages.map((message, i) => <div className={'studio-message ' + (message.by === 'you' ? 'from-you' : 'from-ai')} key={i}>{message.by === 'assistant' && <span className="message-avatar">✦</span>}<p>{message.text}</p></div>)}{busy && <div className="studio-message from-ai"><span className="message-avatar">✦</span><p>Script aan het opstellen…</p></div>}</div>
        {!script && <form className="studio-compose" onSubmit={submit}><div className="compose-prompt">{questions[step].text}</div><div className="compose-row"><input value={draft} onChange={e => setDraft(e.target.value)} placeholder={questions[step].placeholder} disabled={busy} autoComplete="off" /><button disabled={busy || !draft.trim()}>{step === questions.length - 1 ? 'Maak script →' : 'Volgende →'}</button></div>{step === 4 && <div className="duration-choices">{['30 seconden', '45 seconden', '60 seconden'].map(value => <button type="button" className={draft === value ? 'duration-active' : ''} onClick={() => setDraft(value)} key={value}>{value}</button>)}</div>}</form>}
        {script && <div className="script-output"><div className="script-output-head"><span><b>JOUW SCRIPTCONCEPT</b><small>{source === 'openai' ? 'Gegenereerd met AI' : 'Voorbeeldgeneratie · AI-provider niet gekoppeld'}</small></span><button onClick={startOver}>Nieuw script ＋</button></div><pre>{script}</pre><div className="script-actions"><button onClick={() => { void navigator.clipboard?.writeText(script); setErrorText('Script gekopieerd.'); }}>Kopieer script</button><button className="save-script" onClick={saveScript}>{saved ? 'Opgeslagen ✓' : 'Bewaar concept'}</button><small>Volgende stap: script laten controleren en doorsturen naar Productie.</small></div></div>}
        {errorText && <div className="studio-error">{errorText}</div>}
      </div>
    </div>
    <div className="studio-footer"><span>✓ Script wordt pas bewaard als je op <b>Bewaar concept</b> klikt.</span><span>Trenddata: {trends?.fetchedAt ? new Date(trends.fetchedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : 'laden…'}</span></div>
  </section>;
}
