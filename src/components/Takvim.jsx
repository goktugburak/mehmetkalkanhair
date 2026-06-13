import { useState } from 'react'

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const DAYS_HEADER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const dayIndexToTrName = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

const Takvim = ({ selectedDate, onDateSelect, minDate, closedDays = [] }) => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const initialView = selectedDate ? new Date(selectedDate + 'T00:00:00') : today
  const [viewYear, setViewYear] = useState(initialView.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialView.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const grid = []
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    grid.push({ day: d, currentMonth: false, date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({
      day: d,
      currentMonth: true,
      date: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  const remaining = 42 - grid.length
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    grid.push({ day: d, currentMonth: false, date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const isDisabled = (dateStr) => {
    if (!dateStr) return true
    if (minDate && dateStr < minDate) return true
    const dt = new Date(dateStr + 'T00:00:00')
    const dayName = dayIndexToTrName[dt.getDay()]
    if (closedDays.includes(dayName)) return true
    return false
  }

  return (
    <div style={container}>
      <div style={nav}>
        <button onClick={prevMonth} style={navBtn}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <span style={navLabel}>{MONTHS_TR[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={navBtn}>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div style={dayHeaders}>
        {DAYS_HEADER.map((d) => (
          <div key={d} style={dayHeaderCell}>{d}</div>
        ))}
      </div>

      <div style={gridContainer}>
        {grid.map((cell, i) => {
          if (!cell) return <div key={i} />
          const disabled = isDisabled(cell.date)
          const selected = cell.date === selectedDate
          const isToday = cell.date === todayStr
          const dayNum = new Date(cell.date + 'T00:00:00').getDay()
          const isClosed = closedDays.includes(dayIndexToTrName[dayNum])

          return (
            <button
              key={i}
              onClick={() => {
                if (!disabled && cell.currentMonth) onDateSelect(cell.date)
              }}
              disabled={disabled || !cell.currentMonth}
              title={isClosed && cell.currentMonth ? 'Kapalı gün' : ''}
              style={{
                ...dayCell,
                ...(selected ? daySelected : {}),
                ...(isToday && !selected ? dayToday : {}),
                ...(!cell.currentMonth ? dayOther : {}),
                ...(isClosed && !selected ? dayClosed : {}),
                ...(disabled && !isClosed ? dayDisabled : {}),
              }}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const container = {
  background: '#111',
  borderRadius: 10,
  border: '1px solid #2a2725',
  padding: '16px 12px',
  userSelect: 'none',
}

const nav = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
}

const navBtn = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1a1a1a',
  border: '1px solid #2a2725',
  borderRadius: 6,
  color: '#f5f0e8',
  cursor: 'pointer',
  fontSize: 12,
  transition: 'all 0.2s',
}

const navLabel = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 16,
  fontWeight: 500,
  color: '#f5f0e8',
}

const dayHeaders = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 1,
  marginBottom: 4,
}

const dayHeaderCell = {
  textAlign: 'center',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#88807a',
  padding: '4px 0',
}

const gridContainer = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 1,
}

const dayCell = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '2px solid transparent',
  borderRadius: 6,
  color: '#f5f0e8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
  minHeight: 36,
  padding: '2px 0',
}

const daySelected = {
  background: '#C62828',
  borderColor: '#C62828',
  color: '#fff',
  fontWeight: 700,
}

const dayToday = {
  borderColor: 'rgba(198,40,40,0.4)',
}

const dayOther = {
  color: '#2a2725',
  cursor: 'default',
}

const dayClosed = {
  color: '#555',
  cursor: 'not-allowed',
  textDecoration: 'line-through',
}

const dayDisabled = {
  color: '#2a2725',
  cursor: 'not-allowed',
}

export default Takvim
