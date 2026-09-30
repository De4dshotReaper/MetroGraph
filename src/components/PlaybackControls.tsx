import type { PlaybackSpeed } from '../hooks/playbackState.ts'

interface Props {
  isPlaying: boolean; cursor: number; eventCount: number; speed: number; completed: boolean
  onPlay: () => void; onPause: () => void; onStep: () => void; onReset: () => void
  onSpeedChange: (speed: PlaybackSpeed) => void
}

export function PlaybackControls(props: Props) {
  const finished = props.cursor >= props.eventCount
  return <section className="playback-bar" aria-label="Playback controls" data-completed={props.completed} aria-hidden={props.completed} inert={props.completed}>
    <button className="control-secondary" onClick={props.onReset}><span aria-hidden="true">↺</span> Reset</button>
    <button className="control-secondary" disabled={finished} onClick={props.onStep}>Step <span aria-hidden="true">→</span></button>
    <button className="control-play" disabled={finished} onClick={props.isPlaying ? props.onPause : props.onPlay}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">{props.isPlaying ? <path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /> : <path d="M2 1l9 5-9 5z" fill="currentColor" />}</svg>
      {props.isPlaying ? 'Pause' : 'Play'}
    </button>
    <div className="speed-options" role="group" aria-label="Playback speed">
      {([0.5, 1, 2] satisfies PlaybackSpeed[]).map(speed => <button key={speed} aria-pressed={props.speed === speed} aria-label={'Playback speed ' + speed + 'x'} onClick={() => props.onSpeedChange(speed)}>{speed}×</button>)}
    </div>
  </section>
}
