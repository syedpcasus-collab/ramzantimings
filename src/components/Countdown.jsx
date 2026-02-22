import React, { useEffect, useState } from 'react'

// Countdown to next iftar.
// Accepts date + iftar string (HH:mm or hh:mm AM/PM).

function parseIftarTarget(dateStr, iftarStr) {
  if (!dateStr || !iftarStr) return null
  const clean = iftarStr.trim()

  let hh = 0
  let mm = 0

  let match = clean.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    hh = Number(match[1])
    mm = Number(match[2])
  } else {
    match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return null
    hh = Number(match[1])
    mm = Number(match[2])
    const period = match[3].toUpperCase()
    if (period === 'PM' && hh !== 12) hh += 12
    if (period === 'AM' && hh === 12) hh = 0
  }

  const target = new Date(`${dateStr}T00:00:00`)
  target.setHours(hh, mm, 0, 0)
  return target
}

function formatRemaining(diff) {
  if (diff <= 0) return 'Iftar time has started. Ramadan Mubarak!'
  const s = Math.floor(diff / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h ${m}m ${sec}s left`
}

export default function Countdown({ date, iftar }) {
  const [text, setText] = useState('Loading countdown...')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      let target = parseIftarTarget(date, iftar)
      if (!target) {
        setText('Countdown unavailable')
        return
      }
      if (target <= now) {
        target = new Date(target)
        target.setDate(target.getDate() + 1)
      }
      setText(formatRemaining(target.getTime() - now.getTime()))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [date, iftar])

  return <p className="text-xl font-medium">{text}</p>
}
