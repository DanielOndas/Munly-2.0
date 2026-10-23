import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw, X } from 'lucide-react'

type Point = { x: number; y: number }
const SIZE = 20
const CELL = 20
const START_SNAKE: Point[] = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }]
type Direction = 'up' | 'down' | 'left' | 'right'
const VECTORS: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }
function randomFood(snake: Point[]): Point {
  const empty: Point[] = []
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!snake.some(part => part.x === x && part.y === y)) empty.push({ x, y })
  return empty[Math.floor(Math.random() * empty.length)] ?? { x: 0, y: 0 }
}

export default function SnakeGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snakeRef = useRef<Point[]>(START_SNAKE.map(p => ({ ...p })))
  const directionRef = useRef<Direction>('right')
  const queuedDirectionRef = useRef<Direction>('right')
  const foodRef = useRef<Point>(randomFood(START_SNAKE))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem('munly-snake-best') || 0) } catch { return 0 } })
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [tick, setTick] = useState(0)
  const scoreRef = useRef(0)

  const reset = useCallback((start = false) => {
    snakeRef.current = START_SNAKE.map(p => ({ ...p }))
    directionRef.current = 'right'; queuedDirectionRef.current = 'right'
    foodRef.current = randomFood(START_SNAKE)
    scoreRef.current = 0; setScore(0); setTick(v => v + 1); setStatus(start ? 'playing' : 'ready')
  }, [])

  const changeDirection = useCallback((next: Direction) => {
    if (next !== OPPOSITE[directionRef.current]) queuedDirectionRef.current = next
    if (status === 'ready') setStatus('playing')
  }, [status])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }
      if (keyMap[event.key]) { event.preventDefault(); changeDirection(keyMap[event.key]) }
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setStatus(s => s === 'playing' ? 'paused' : s === 'over' ? 'over' : 'playing') }
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [changeDirection, onClose])

  useEffect(() => {
    if (status !== 'playing') return
    const timer = window.setInterval(() => {
      directionRef.current = queuedDirectionRef.current
      const vector = VECTORS[directionRef.current]
      const head = snakeRef.current[0]
      const next = { x: head.x + vector.x, y: head.y + vector.y }
      const eating = next.x === foodRef.current.x && next.y === foodRef.current.y
      const body = eating ? snakeRef.current : snakeRef.current.slice(0, -1)
      if (next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE || body.some(p => p.x === next.x && p.y === next.y)) {
        setStatus('over'); return
      }
      snakeRef.current = eating ? [next, ...snakeRef.current] : [next, ...snakeRef.current.slice(0, -1)]
      if (eating) {
        foodRef.current = randomFood(snakeRef.current)
        scoreRef.current += 1; setScore(scoreRef.current)
        setBest(previous => {
          const nextBest = Math.max(previous, scoreRef.current)
          try { localStorage.setItem('munly-snake-best', String(nextBest)) } catch { /* local storage may be unavailable */ }
          return nextBest
        })
      }
      setTick(v => v + 1)
    }, Math.max(75, 145 - Math.floor(score / 4) * 8))
    return () => window.clearInterval(timer)
  }, [status, score])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#17191d'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#25282e'; context.lineWidth = 0.6
    for (let i = 1; i < SIZE; i++) { context.beginPath(); context.moveTo(i * CELL, 0); context.lineTo(i * CELL, canvas.height); context.stroke(); context.beginPath(); context.moveTo(0, i * CELL); context.lineTo(canvas.width, i * CELL); context.stroke() }
    const food = foodRef.current
    context.fillStyle = '#aeb4bf'; context.beginPath(); context.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * .31, 0, Math.PI * 2); context.fill()
    snakeRef.current.forEach((part, index) => { context.fillStyle = index === 0 ? '#f0f1f4' : '#c2c6ce'; context.beginPath(); context.roundRect(part.x * CELL + 1.5, part.y * CELL + 1.5, CELL - 3, CELL - 3, 4); context.fill() })
  }, [tick, status])

  const control = (direction: Direction, label: string, Icon: typeof ArrowUp) => <button className="snake-direction" aria-label={label} onClick={() => changeDirection(direction)}><Icon size={19} /></button>

  return <div className="snake-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="snake-modal" role="dialog" aria-modal="true" aria-labelledby="snake-title">
      <header className="snake-header"><div><div className="snake-title-line"><span className="snake-mark"><span /></span><h2 id="snake-title">Snake</h2></div><p>Classic arcade. MUNly edition.</p></div><button className="snake-close" onClick={onClose} aria-label="Close Snake"><X size={19} /></button></header>
      <div className="snake-stats"><div><span>Score</span><strong>{String(score).padStart(3, '0')}</strong></div><div><span>Best score</span><strong>{String(best).padStart(3, '0')}</strong></div></div>
      <div className="snake-board-wrap"><canvas ref={canvasRef} width={SIZE * CELL} height={SIZE * CELL} className="snake-board" aria-label="Snake game board" />
        {status !== 'playing' && <div className="snake-overlay"><strong>{status === 'ready' ? 'Ready when you are' : status === 'paused' ? 'Game paused' : 'Game over'}</strong><span>{status === 'ready' ? 'Eat the dots. Avoid the walls and yourself.' : status === 'paused' ? 'Take a breath, then continue.' : `You scored ${score} ${score === 1 ? 'point' : 'points'}.`}</span><button className="snake-primary" onClick={() => status === 'over' ? reset(true) : setStatus('playing')}>{status === 'paused' ? <Play size={15} /> : status === 'over' ? <RotateCcw size={15} /> : <Play size={15} />}{status === 'paused' ? 'Resume' : status === 'over' ? 'Play again' : 'Start game'}</button></div>}
      </div>
      <div className="snake-footer"><span>Move with <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> or WASD</span><button className="snake-secondary" onClick={() => setStatus(s => s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s === 'over' ? (reset(true), 'playing') : 'playing')}>{status === 'playing' ? <Pause size={15} /> : <Play size={15} />}{status === 'playing' ? 'Pause' : 'Play'}</button><button className="snake-secondary" onClick={() => reset(false)}><RotateCcw size={15} /> Reset</button></div>
      <div className="snake-touch" aria-label="Touch controls"><div />{control('up', 'Move up', ArrowUp)}<div />{control('left', 'Move left', ArrowLeft)}{control('down', 'Move down', ArrowDown)}{control('right', 'Move right', ArrowRight)}</div>
    </section>
  </div>
}
