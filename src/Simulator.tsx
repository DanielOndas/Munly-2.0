import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowRight, Check, ChevronRight, HelpCircle, Clock3, FileText, Users, RotateCcw, Save, ScrollText, Send, ShieldCheck, Vote } from 'lucide-react'
import { supabase } from './lib/supabase'

type Phase = 'briefing' | 'debate' | 'negotiation' | 'resolution' | 'voting' | 'results'
type ScenarioId = 'climate' | 'humanitarian' | 'security'
type EventKind = 'chair' | 'delegate' | 'you' | 'system'
type GameEvent = { id: string; kind: EventKind; speaker: string; text: string; round: number }
type Clause = { id: string; text: string; type: 'Preambulatory' | 'Operative' }
type GameState = {
  id: string | null; scenario: ScenarioId; country: string; phase: Phase; round: number; difficulty: 'Beginner' | 'Standard' | 'Advanced'
  events: GameEvent[]; support: Record<string, number>; relationship: Record<string, number>; objectives: string[]; selectedAction: string | null
  clauses: Clause[]; clauseDraft: string; speechDraft: string; votes: Record<string, 'For' | 'Against' | 'Abstain'>; result: { passed: boolean; score: number; objectiveCount: number } | null
}
type Scenario = { id: ScenarioId; title: string; committee: string; agenda: string; summary: string; country: string; objectives: string[]; countries: { name: string; stance: string; priority: string; flexibility: number }[] }

const scenarios: Scenario[] = [
  { id: 'climate', title: 'Climate action', committee: 'UN meeting about the environment', agenda: 'How countries can cut pollution fairly', summary: 'Countries disagree about how quickly to cut pollution and who should help pay for the changes.', country: 'United States', objectives: ['Agree on clear goals to cut pollution', 'Help countries get clean-energy technology', 'Get several countries to support the final plan'], countries: [
    { name: 'Brazil', stance: 'Wants richer countries to help pay for climate action and protect forests.', priority: 'Money for climate action', flexibility: 2 },
    { name: 'India', stance: 'Wants to keep improving living standards and make sure climate costs are shared fairly.', priority: 'Fair chances to develop', flexibility: 3 },
    { name: 'Germany', stance: 'Wants strong goals and clear updates on progress.', priority: 'Clear goals', flexibility: 2 },
    { name: 'China', stance: 'Wants countries to work together, but says the rules should be fair to everyone.', priority: 'Fair sharing of responsibility', flexibility: 2 },
  ] },
  { id: 'humanitarian', title: 'Humanitarian crisis', committee: 'UN General Assembly', agenda: 'Making sure people can get emergency help safely', summary: "Countries must find a way to deliver help quickly while respecting each country’s control over its land and checking that aid reaches people.", country: 'France', objectives: ['Make sure help can reach people safely', 'Check that aid reaches the people who need it', 'Protect civilians and respect each country’s control over its land'], countries: [
    { name: 'Kenya', stance: 'Wants safe, reliable routes for aid and nearby countries to work together.', priority: 'Getting help to people', flexibility: 3 },
    { name: 'Japan', stance: 'Wants clear checks on how aid money is spent and where supplies go.', priority: 'Checking where aid goes', flexibility: 2 },
    { name: 'Egypt', stance: 'Says aid work must respect the country involved and get its agreement.', priority: "Each country’s right to make its own decisions", flexibility: 2 },
    { name: 'Canada', stance: 'Wants civilians protected and enough money for emergency help.', priority: 'Keeping ordinary people safe', flexibility: 3 },
  ] },
  { id: 'security', title: 'International security', committee: 'Security Council practice meeting', agenda: 'How countries can work together to stop illegal trafficking across borders', summary: "Countries must decide how to work together to stop trafficking while following the law and protecting people’s rights.", country: 'United States', objectives: ['Help countries work together across borders', 'Make sure police follow the law', 'Work on stopping trafficking before it happens, too'], countries: [
    { name: 'United Kingdom', stance: 'Wants police in different countries to work on cases together and share useful information.', priority: 'Police working together', flexibility: 2 },
    { name: 'Brazil', stance: 'Wants nearby countries to work together while each country keeps control of its own decisions.', priority: 'Nearby countries working together', flexibility: 3 },
    { name: 'Mexico', stance: 'Wants countries to work together, prevent drug problems and protect public health.', priority: 'Stopping problems early', flexibility: 3 },
    { name: 'India', stance: 'Wants clear rules about what information can be shared and who can use it.', priority: "Rules that protect people’s rights", flexibility: 2 },
  ] },
]
const actionOptions = [
  { id: 'support', title: 'Support the proposal', description: 'Show that you agree and are ready to work with other countries.', effect: 2, response: 'You show that you are ready to work together. The other country is glad you support the idea.' },
  { id: 'challenge', title: 'Challenge the proposal', description: 'Ask whether the idea solves the main problem.', effect: -1, response: 'Your response starts a stronger debate. Some countries agree with your question, while others want you to suggest another idea.' },
  { id: 'compromise', title: 'Offer a compromise', description: 'Suggest a middle option that includes clear rules and practical help.', effect: 2, response: 'Your middle option gives more countries a reason to agree, but the details still matter.' },
  { id: 'question', title: 'Ask a focused question', description: 'Ask for an explanation before deciding whether you agree.', effect: 1, response: 'Your question makes the idea clearer. The Chair lets the other country explain, so everyone knows what is being suggested.' },
]
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
function initialState(scenario: Scenario, difficulty: GameState['difficulty']): GameState {
  return { id: null, scenario: scenario.id, country: scenario.country, phase: 'briefing', round: 1, difficulty, events: [], support: Object.fromEntries(scenario.countries.map(c => [c.name, 0])), relationship: Object.fromEntries(scenario.countries.map(c => [c.name, 0])), objectives: [], selectedAction: null, clauses: [], clauseDraft: '', speechDraft: '', votes: {}, result: null }
}

export default function Simulator({ session }: { session: Session }) {
  const [game, setGame] = useState<GameState | null>(null)
  const [scenarioId, setScenarioId] = useState<ScenarioId>('climate')
  const [difficulty, setDifficulty] = useState<GameState['difficulty']>('Beginner')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [action, setAction] = useState('compromise')
  const [speech, setSpeech] = useState('')
  const [clauseText, setClauseText] = useState('')
  const [clauseType, setClauseType] = useState<Clause['type']>('Operative')
  const [motionChoice, setMotionChoice] = useState<'moderated' | 'unmoderated' | 'clarification'>('moderated')
  const scenario = scenarios.find(item => item.id === game?.scenario) ?? scenarios[0]

  const persist = useCallback(async (state: GameState, isNew = false) => {
    if (!supabase || !session.user.id) { setNotice('Your game is running, but cloud saving is unavailable until Supabase is configured.'); return }
    setSaving(true)
    try {
      if (isNew || !state.id) {
        const { data, error } = await supabase.from('simulator_sessions').insert({ user_id: session.user.id, scenario_id: state.scenario, status: state.phase === 'results' ? 'completed' : 'in_progress', game_state: state }).select('id').single()
        if (error) throw error
        state.id = data.id
        setGame({ ...state })
      } else {
        const { error } = await supabase.from('simulator_sessions').update({ scenario_id: state.scenario, status: state.phase === 'results' ? 'completed' : 'in_progress', game_state: state, updated_at: new Date().toISOString() }).eq('id', state.id).eq('user_id', session.user.id)
        if (error) throw error
      }
      setNotice('Progress saved.')
    } catch (error) {
      setNotice(error instanceof Error && error.message.includes('simulator_sessions') ? 'Cloud saving needs the included simulator_sessions migration to be run in Supabase. Your current session remains open.' : `Save issue: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally { setSaving(false) }
  }, [session.user.id])

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!supabase) { if (active) setLoading(false); return }
      const { data, error } = await supabase.from('simulator_sessions').select('id,game_state,updated_at').eq('user_id', session.user.id).eq('status', 'in_progress').order('updated_at', { ascending: false }).limit(1)
      if (!active) return
      if (!error && data?.[0]?.game_state) setGame({ ...(data[0].game_state as GameState), id: data[0].id })
      setLoading(false)
    }
    void load(); return () => { active = false }
  }, [session.user.id])

  const countries = scenario.countries
  const addEvent = (state: GameState, kind: EventKind, speaker: string, text: string) => ({ ...state, events: [...state.events, { id: id(), kind, speaker, text, round: state.round }] })
  const update = (fn: (state: GameState) => GameState) => { if (!game) return; const next = fn({ ...game, events: [...game.events], support: { ...game.support }, relationship: { ...game.relationship }, objectives: [...game.objectives], clauses: [...game.clauses], votes: { ...game.votes } }); setGame(next); void persist(next) }
  const startGame = (chosen: Scenario = scenarios.find(s => s.id === scenarioId) ?? scenarios[0]) => {
    const fresh = initialState(chosen, difficulty)
    let next = addEvent(fresh, 'chair', 'The Chair', `Welcome! Today’s topic is: ${chosen.agenda}. Countries may now share their first thoughts.`)
    next = addEvent(next, 'delegate', chosen.countries[0].name, chosen.countries[0].stance)
    next = addEvent(next, 'delegate', chosen.countries[1].name, chosen.countries[1].stance)
    setGame(next); setNotice(''); void persist(next, true)
  }
  const chooseAction = () => {
    if (!game) return
    const option = actionOptions.find(item => item.id === action) ?? actionOptions[2]
    let next: GameState = { ...game, phase: 'debate', selectedAction: option.id, round: game.round + 1 }
    next = addEvent(next, 'you', game.country, option.title + '. ' + (speech.trim() ? speech.trim() : option.description))
    const target = countries[(game.round - 1) % countries.length]
    const boost = game.difficulty === 'Beginner' ? 1 : game.difficulty === 'Advanced' ? -1 : 0
    const impact = option.effect + boost
    next.support[target.name] = Math.max(-3, Math.min(5, (next.support[target.name] ?? 0) + impact))
    next.relationship[target.name] = Math.max(-3, Math.min(5, (next.relationship[target.name] ?? 0) + (option.id === 'challenge' ? -1 : 1)))
    next = addEvent(next, 'delegate', target.name, `${target.stance} ${option.id === 'challenge' ? 'The country asks whether your idea takes its concerns seriously.' : option.id === 'compromise' ? 'The country is open to a middle option if the plan includes ' + target.priority.toLowerCase() + '.' : 'The country has heard your view and is willing to keep talking.'}`)
    if (next.round >= 3) next = addEvent(next, 'chair', 'The Chair', 'Several countries have shared their views. You can now talk to them and try to agree on parts of a plan.')
    setGame(next); setSpeech(''); setNotice(''); void persist(next)
  }
  const beginNegotiation = () => update(s => addEvent({ ...s, phase: 'negotiation' }, 'chair', 'The Chair', 'You can now talk to other countries. Try suggesting a clear middle option.'))
  const raiseMotion = () => {
    if (!game || game.phase !== 'debate') return
    if (motionChoice === 'clarification') {
      let next = addEvent(game, 'you', game.country, 'Asks the other country to explain its idea before responding.')
      next = addEvent(next, 'chair', 'The Chair', 'The Chair has heard your request. The other country can explain its idea, and the debate will continue.')
      setGame(next); void persist(next); return
    }
    const motionName = motionChoice === 'moderated' ? 'a short, focused discussion' : 'open discussion time'
    let next = addEvent(game, 'you', game.country, `Asks for ${motionName} to discuss the topic in more detail.`)
    next = addEvent(next, 'chair', 'The Chair', motionChoice === 'moderated'
      ? 'The Chair accepts your request for this practice session. The group will have a short, focused discussion. Keep your points brief and about the topic.'
      : 'The Chair accepts your request for this practice session. You can now talk freely with other countries and try to agree on a plan.')
    next = { ...next, phase: 'negotiation' as Phase }
    setGame(next); void persist(next)
  }
  const negotiate = (countryName: string, approach: 'compromise' | 'firm' | 'ask') => {
    if (!game) return
    const country = countries.find(c => c.name === countryName) ?? countries[0]
    const current = game.support[countryName] ?? 0
    let delta = approach === 'compromise' ? (country.flexibility >= 3 ? 2 : 1) : approach === 'firm' ? -1 : 1
    if (game.difficulty === 'Advanced' && approach === 'firm') delta -= 1
    const support = { ...game.support, [countryName]: Math.max(-3, Math.min(5, current + delta)) }
    const relationship = { ...game.relationship, [countryName]: Math.max(-3, Math.min(5, (game.relationship[countryName] ?? 0) + (approach === 'firm' ? -1 : 1))) }
    let next: GameState = { ...game, support, relationship, phase: 'negotiation' }
    const text = approach === 'compromise' ? `You offer to include something that matters to ${country.name}: ${country.priority.toLowerCase()}.` : approach === 'firm' ? 'You tell the country you want it to support your idea without changes.' : `You ask what would make the plan acceptable to ${country.name}.`
    next = addEvent(next, 'you', game.country, text)
    next = addEvent(next, 'delegate', country.name, support[countryName] >= 2 ? 'The country is ready to support the plan if it includes what matters most to them.' : support[countryName] >= 0 ? `The country is willing to talk, but wants the plan to deal with ${country.priority.toLowerCase()}.` : 'The country is not convinced yet. You will need to change the plan quite a bit to get its support.')
    setGame(next); void persist(next)
  }
  const addClause = () => {
    if (!game || !clauseText.trim()) return
    const next = { ...game, phase: 'resolution' as Phase, clauses: [...game.clauses, { id: id(), type: clauseType, text: clauseText.trim() }], clauseDraft: '' }
    const final = addEvent(next, 'you', game.country, `Added ${clauseType.toLowerCase()} clause: ${clauseText.trim()}`)
    setGame(final); setClauseText(''); void persist(final)
  }
  const removeClause = (clauseId: string) => update(s => ({ ...s, clauses: s.clauses.filter(c => c.id !== clauseId) }))
  const goToResolution = () => {
    if (!game) return
    let next = { ...game, phase: 'resolution' as Phase }
    if (!next.clauses.length) next.clauses = [{ id: id(), type: 'Preambulatory', text: 'Knowing that countries need to work together,' }, { id: id(), type: 'Operative', text: `Asks countries to work together on ${scenario.agenda.toLowerCase()};` }]
    next = addEvent(next, 'chair', 'The Chair', 'Your final plan is taking shape. Add the actions you want countries to take, then send it to a vote.')
    setGame(next); void persist(next)
  }
  const callVote = () => {
    if (!game) return
    let votes: GameState['votes'] = {}
    countries.forEach(c => { const value = game.support[c.name] ?? 0; votes[c.name] = value >= (game.difficulty === 'Advanced' ? 2 : 1) ? 'For' : value <= -2 ? 'Against' : 'Abstain' })
    const supportCount = Object.values(votes).filter(v => v === 'For').length
    const passed = supportCount >= Math.ceil(countries.length * (game.difficulty === 'Advanced' ? 0.75 : 0.5))
    const objectiveCount = Math.min(game.objectives.length + (game.clauses.length >= 2 ? 1 : 0) + (supportCount >= 2 ? 1 : 0), scenario.objectives.length)
    const score = Math.max(0, Math.min(100, Math.round(35 + supportCount * 10 + objectiveCount * 12 + game.clauses.length * 3 + Object.values(game.relationship).reduce((a, b) => a + b, 0) * 2 + (passed ? 10 : 0))))
    let next: GameState = { ...game, phase: 'results', votes, result: { passed, score, objectiveCount }, objectives: scenario.objectives.slice(0, objectiveCount) }
    next = addEvent(next, 'chair', 'The Chair', 'Voting is finished. The group has decided whether to accept your plan.')
    setGame(next); void persist(next)
  }
  const restart = () => { setGame(null); setNotice(''); setLoading(false) }
  
  if (loading) return <div className="panel rounded-2xl p-10 text-center muted">Loading your simulator session…</div>
  if (!game) return <div className="space-y-6 animate-fade-in-up"><div><h1 className="text-2xl font-semibold mt-1">Your first MUN meeting starts here.</h1><p className="muted mt-2 max-w-2xl">A MUN practice game for beginners. Make choices, talk with other countries, build a plan and see if the group agrees to it.</p></div><div className="grid md:grid-cols-3 gap-4">{scenarios.map(item => <button key={item.id} onClick={() => setScenarioId(item.id)} className={`panel rounded-2xl p-5 text-left transition ${scenarioId === item.id ? 'border-[#8a7549] bg-[#211e18]' : 'hover:border-[#55545a]'}`}><h2 className="font-semibold text-lg mt-3">{item.title}</h2><p className="muted text-sm mt-2">{item.summary}</p><span className="gold-text text-xs mt-4 inline-flex items-center gap-1">{scenarioId === item.id ? 'Selected' : 'Select scenario'} <ChevronRight size={14} /></span></button>)}</div><div className="panel rounded-2xl p-5"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><label className="block text-sm font-medium mb-2">Difficulty</label><div className="flex flex-wrap gap-2">{(['Beginner', 'Standard', 'Advanced'] as const).map(level => <button key={level} onClick={() => setDifficulty(level)} className={`rounded-lg border px-3 py-2 text-sm ${difficulty === level ? 'selected-filter' : 'border-[var(--border)] text-[var(--muted)]'}`}>{level}</button>)}</div></div><button onClick={() => startGame()} className="btn-gold rounded-xl px-5 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2">Start game <ArrowRight size={16} /></button></div></div><div className="sub-panel rounded-xl p-4 flex gap-3"><HelpCircle size={18} className="gold-text shrink-0 mt-0.5" /><p className="muted text-sm">Never been to MUN before? That’s okay. The game explains each step, and your choices change how other countries respond.</p></div></div>

  return <div className="space-y-5 animate-fade-in-up"><div className="page-title-row"><div><h1 className="text-2xl font-semibold mt-1">{scenario.title}</h1><p className="muted text-sm mt-1">Representing {game.country} · {game.difficulty} difficulty</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2" onClick={() => void persist(game)}><Save size={15} />{saving ? 'Saving…' : 'Save'}</button><button className="btn-secondary rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2" onClick={restart}><RotateCcw size={15} />New game</button></div></div>
    {notice && <p role="status" className="muted text-xs rounded-lg bg-[#1c1d22] border border-[var(--border)] p-3">{notice}</p>}
    <div className="flex flex-wrap gap-2">{(['briefing', 'debate', 'negotiation', 'resolution', 'voting', 'results'] as Phase[]).map((phase, index) => <span key={phase} className={`meta-chip ${game.phase === phase ? 'selected-filter' : ''}`}>{index + 1}. {{ briefing: 'Start', debate: 'Discussion', negotiation: 'Talk to countries', resolution: 'Build a plan', voting: 'Vote', results: 'Results' }[phase]}</span>)}</div>
    {game.phase === 'briefing' && <div className="panel rounded-2xl p-6 space-y-5"><div><h2 className="text-xl font-semibold mt-1">You represent: {game.country}</h2><p className="muted mt-2">{scenario.summary}</p><div className="sub-panel rounded-xl p-3 mt-3"><strong className="text-sm">Quick guide</strong><p className="muted text-sm mt-1 leading-6">MUN is a meeting where you speak for a country. You share ideas, try to agree with other countries, write a plan, and vote on it. The Chair runs the meeting.</p></div></div><div><h3 className="font-semibold text-sm mb-3">Your country's goals</h3><ul className="space-y-2">{scenario.objectives.map(objective => <li key={objective} className="flex gap-2 text-sm"><Check size={16} className="gold-text shrink-0 mt-0.5" />{objective}</li>)}</ul></div><div><h3 className="font-semibold text-sm mb-3">Other countries</h3><div className="space-y-3">{countries.map(country => <div key={country.name} className="sub-panel rounded-xl p-3"><div className="font-medium text-sm">{country.name} <span className="muted font-normal">· What matters to them: {country.priority}</span></div><p className="muted text-sm mt-1">{country.stance}</p></div>)}</div></div><button onClick={() => update(s => addEvent({ ...s, phase: 'debate' }, 'chair', 'The Chair', 'The Chair is ready to hear from countries. Choose how you want to respond.'))} className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">Start meeting <ArrowRight size={16} /></button></div>}
    {['debate', 'negotiation', 'resolution', 'voting', 'results'].includes(game.phase) && <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5"><div className="space-y-4 min-w-0"><div className="panel rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between"><div><h2 className="font-semibold mt-1">What happens next</h2></div><span className="meta-chip"><Clock3 size={12} /> Round {game.round}</span></div><div className="p-5 space-y-4">{game.events.slice(-8).map(event => <article key={event.id} className={`border-l-2 pl-3 py-1 ${event.kind === 'you' ? 'border-[#d4b477]' : event.kind === 'chair' ? 'border-[#696a75]' : event.kind === 'system' ? 'border-[#8eae8b]' : 'border-[#454650]'}`}><div className="text-xs font-semibold mb-1"><span className={event.kind === 'you' ? 'gold-text' : ''}>{event.speaker}</span><span className="muted font-normal"> · Round {event.round}</span></div><p className="text-sm leading-6 text-[#d0cfd4]">{event.text}</p></article>)}{game.events.length === 0 && <p className="muted text-sm">The chair will introduce the agenda when you begin.</p>}</div></div>
      {game.phase === 'debate' && <div className="panel rounded-2xl p-5 space-y-4"><div><h2 className="text-lg font-semibold mt-1">How do you respond?</h2><p className="muted text-sm mt-1">Pick the answer that best fits what you want to do. You can also write your own words.</p></div><div className="space-y-2">{actionOptions.map(option => <label key={option.id} className={`block rounded-xl border p-3 cursor-pointer ${action === option.id ? 'border-[#8a7549] bg-[#211e18]' : 'border-[var(--border)] hover:border-[#55545a]'}`}><span className="flex gap-2"><input type="radio" name="sim-action" checked={action === option.id} onChange={() => setAction(option.id)} className="mt-1 accent-[#d4b477]" /><span><strong className="text-sm">{option.title}</strong><span className="muted block text-xs mt-1 leading-5">{option.description}</span></span></span></label>)}</div><label className="block"><span className="text-sm font-medium">Write your own words (optional)</span><textarea value={speech} onChange={e => setSpeech(e.target.value)} rows={3} className="field editor-area rounded-xl w-full p-3 mt-2 text-sm" placeholder="Chair, the United States believes…" /></label><button onClick={chooseAction} className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">Say this <Send size={15} /></button><p className="muted text-xs">Other countries react based on what matters to them and what you choose to say.</p><div className="border-t border-[var(--border)] pt-4 mt-4 space-y-3"><div><h3 className="font-semibold text-sm mt-1">You can also make a request</h3><p className="muted text-xs mt-1">You can ask the Chair to change how the discussion works. The options below explain what each request means.</p></div><select value={motionChoice} onChange={e => setMotionChoice(e.target.value as typeof motionChoice)} className="field rounded-xl px-3 py-2.5 text-sm w-full"><option value="moderated">Ask for a short, focused discussion</option><option value="unmoderated">Ask for open discussion time</option><option value="clarification">Ask someone to explain their idea</option></select><button onClick={raiseMotion} className="btn-secondary rounded-xl px-3 py-2.5 text-sm inline-flex items-center gap-2"><Send size={14} /> Make request</button></div></div>}
      {game.phase === 'negotiation' && <div className="panel rounded-2xl p-5"><h2 className="text-lg font-semibold mt-1">Who do you want to talk to?</h2><p className="muted text-sm mt-2 mb-4">You have a better chance of getting support if you include something that matters to that country.</p><div className="space-y-3">{countries.map(country => <div key={country.name} className="sub-panel rounded-xl p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{country.name}</strong><span className="meta-chip">Support {game.support[country.name] ?? 0}</span></div><p className="muted text-xs mt-1">What matters to them: {country.priority}</p><div className="flex flex-wrap gap-2 mt-3"><button onClick={() => negotiate(country.name, 'compromise')} className="btn-secondary rounded-lg px-2.5 py-2 text-xs inline-flex items-center gap-1"><Users size={13} /> Suggest a middle option</button><button onClick={() => negotiate(country.name, 'ask')} className="btn-secondary rounded-lg px-2.5 py-2 text-xs">Ask what they need</button><button onClick={() => negotiate(country.name, 'firm')} className="btn-secondary rounded-lg px-2.5 py-2 text-xs">Stick to your idea</button></div></div>)}</div><button onClick={goToResolution} className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 mt-4">Build your final plan <ArrowRight size={15} /></button></div>}
      {game.phase === 'resolution' && <div className="panel rounded-2xl p-5 space-y-4"><div><h2 className="text-lg font-semibold mt-1">Build your plan</h2><p className="muted text-sm mt-1">Add clear actions to your plan. A good plan tackles the problem and includes ideas other countries can agree with.</p></div><div className="flex flex-wrap gap-2"><select value={clauseType} onChange={e => setClauseType(e.target.value as Clause['type'])} className="field rounded-xl px-3 py-2.5 text-sm"><option value="Preambulatory">Background (why this matters)</option><option value="Operative">Action (what countries should do)</option></select><input value={clauseText} onChange={e => setClauseText(e.target.value)} className="field rounded-xl px-3 py-2.5 text-sm flex-1 min-w-[160px]" placeholder="Write one action you want countries to take…" /></div><button onClick={addClause} disabled={!clauseText.trim()} className="btn-secondary rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"><FileText size={14} /> Add action to plan</button><div className="space-y-2">{game.clauses.map(clause => <div key={clause.id} className="sub-panel rounded-xl p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm mt-1 leading-6">{clause.text}</p></div><button onClick={() => removeClause(clause.id)} className="danger-link text-xs">Remove</button></div></div>)}</div>{game.clauses.length === 0 && <p className="muted text-sm">Your plan is empty. Add at least one action before voting.</p>}<button onClick={() => update(s => addEvent({ ...s, phase: 'voting' }, 'chair', 'The Chair', 'Your plan has been sent to the group. Each country will vote based on what matters to them and your talks.'))} disabled={!game.clauses.some(c => c.type === 'Operative')} className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Vote size={15} /> Send plan to vote</button></div>}
      {game.phase === 'voting' && <div className="panel rounded-2xl p-5 space-y-4"><h2 className="text-lg font-semibold">It’s time for the countries to vote.</h2><p className="muted text-sm">Read your plan one last time. In this practice game, each country votes based on what matters to them and how your talks went.</p><div className="sub-panel rounded-xl p-4 space-y-3">{game.clauses.map((clause, index) => <p key={clause.id} className="text-sm"><span className="gold-text mr-2">{index + 1}.</span>{clause.text}</p>)}</div><button onClick={callVote} className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2"><Vote size={15} /> Open the vote</button></div>}
      {game.phase === 'results' && game.result && <div className="panel rounded-2xl p-5 space-y-5"><h2 className="text-2xl font-semibold">{game.result.passed ? 'The group accepts your plan!' : 'The group does not accept your plan this time.'}</h2><p className="muted text-sm">Your score depends on how much support you earned, the plan you made and how many of your country's goals you reached.</p><div className="grid sm:grid-cols-3 gap-3"><div className="sub-panel rounded-xl p-4"><span className="muted text-xs">Your score</span><strong className="block text-2xl mt-1 gold-text">{game.result.score}/100</strong></div><div className="sub-panel rounded-xl p-4"><span className="muted text-xs">Goals reached</span><strong className="block text-2xl mt-1">{game.result.objectiveCount}/{scenario.objectives.length}</strong></div><div className="sub-panel rounded-xl p-4"><span className="muted text-xs">Clauses drafted</span><strong className="block text-2xl mt-1">{game.clauses.length}</strong></div></div><div><h3 className="font-semibold text-sm mb-3">How each country voted</h3><div className="space-y-2">{countries.map(country => <div key={country.name} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2"><span className="text-sm">{country.name}</span><span className={`status-chip ${game.votes[country.name] === 'For' ? '' : ''}`}>{game.votes[country.name]}</span></div>)}</div></div><div><h3 className="font-semibold text-sm mb-2">Your country's goals</h3>{scenario.objectives.map(objective => <p key={objective} className="text-sm muted py-1">{game.objectives.includes(objective) ? '✓' : '○'} {objective}</p>)}</div><button onClick={restart} className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2"><RotateCcw size={15} /> Start another campaign</button></div>}
      </div><aside className="space-y-4"><div className="panel rounded-2xl p-4"><div className="mt-3 space-y-3"><div><span className="muted text-xs block">What’s happening now</span><strong className="text-sm capitalize">{{ briefing: 'Start', debate: 'Discussion', negotiation: 'Talk to countries', resolution: 'Build a plan', voting: 'Vote', results: 'Results' }[game.phase]}</strong></div><div><span className="muted text-xs block">Your country</span><strong className="text-sm">{game.country}</strong></div><div><span className="muted text-xs block">Actions in your plan</span><strong className="text-sm">{game.clauses.length}</strong></div><div><span className="muted text-xs block">Cloud status</span><strong className="text-sm">{saving ? 'Saving…' : game.id ? 'Session saved' : 'Not yet saved'}</strong></div></div></div><div className="panel rounded-2xl p-4"><div className="mt-3 space-y-3">{countries.map(country => <div key={country.name}><div className="flex justify-between gap-2 text-xs"><strong>{country.name}</strong><span className="muted">{game.support[country.name] ?? 0} support</span></div><div className="h-1.5 rounded-full bg-[#2a2b31] mt-2 overflow-hidden"><div className="h-full rounded-full bg-[#d4b477]" style={{ width: `${Math.max(5, Math.min(100, ((game.support[country.name] ?? 0) + 3) / 8 * 100))}%` }} /></div></div>)}</div></div><div className="sub-panel rounded-xl p-4"><div className="flex gap-2"><ShieldCheck size={17} className="gold-text shrink-0" /><div><strong className="text-sm">MUN tip</strong><p className="muted text-xs leading-5 mt-1">Pay attention to what other countries care about. A clear offer to meet them halfway can win more support than a general speech.</p></div></div></div><button onClick={beginNegotiation} disabled={['negotiation', 'resolution', 'voting', 'results'].includes(game.phase)} className="btn-secondary rounded-xl w-full px-3 py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"><Users size={15} /> Open negotiations</button><button onClick={goToResolution} disabled={['resolution', 'voting', 'results'].includes(game.phase)} className="btn-secondary rounded-xl w-full px-3 py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"><ScrollText size={15} /> Start resolution</button></aside></div>}
  </div>
}
