import { useEffect, useState } from 'react'

const LAUNCH = new Date('2026-06-15T00:00:00')

function getTimeLeft() {
  const diff = LAUNCH - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  }
}

function Unit({ value, label }) {
  const display = String(value).padStart(2, '0')
  return (
    <div className="countdown-unit">
      <div className="countdown-value" aria-hidden="true">
        <span key={display} className="countdown-digit">
          {display}
        </span>
      </div>
      <span className="countdown-label">{label}</span>
    </div>
  )
}

export default function Countdown() {
  const [time, setTime] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  if (time.done) {
    return <p className="countdown-live">We&apos;re live.</p>
  }

  return (
    <div
      className="countdown"
      role="timer"
      aria-live="polite"
      aria-label={`Launching June 15, 2026. ${time.days} days, ${time.hours} hours, ${time.minutes} minutes, ${time.seconds} seconds remaining`}
    >
      <p className="countdown-heading">Launching 15 June 2026</p>
      <div className="countdown-grid">
        <Unit value={time.days} label="Days" />
        <span className="countdown-sep" aria-hidden="true">:</span>
        <Unit value={time.hours} label="Hours" />
        <span className="countdown-sep" aria-hidden="true">:</span>
        <Unit value={time.minutes} label="Minutes" />
        <span className="countdown-sep" aria-hidden="true">:</span>
        <Unit value={time.seconds} label="Seconds" />
      </div>
    </div>
  )
}
