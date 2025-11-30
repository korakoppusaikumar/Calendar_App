import React, { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  differenceInMinutes
} from 'date-fns'
import './Calendar.css'

function groupEventsByDate(events) {
  const map = {}
  events.forEach(e => {
    const dateKey = e.date // ISO date string "YYYY-MM-DD"
    if (!map[dateKey]) map[dateKey] = []
    map[dateKey].push(e)
  })
  return map
}

// simple conflict detection: mark events that overlap by time range
function detectConflicts(eventsForDay) {
  // eventsForDay: array of events with startTime and durationMinutes
  const results = eventsForDay.map(e => ({ ...e, conflict: false }))
  // compute start and end as minutes from midnight
  function toMinutes(t) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  for (let i = 0; i < results.length; i++) {
    const aStart = toMinutes(results[i].startTime)
    const aEnd = aStart + results[i].durationMinutes
    for (let j = i + 1; j < results.length; j++) {
      const bStart = toMinutes(results[j].startTime)
      const bEnd = bStart + results[j].durationMinutes
      const overlap = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
      if (overlap > 0) {
        results[i].conflict = true
        results[j].conflict = true
      }
    }
  }
  return results
}

export default function Calendar({ initialEvents = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [searchDate, setSearchDate] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const eventsByDate = useMemo(() => groupEventsByDate(initialEvents), [initialEvents])

  const handleSearch = (e) => {
    e.preventDefault()
    try {
      // Parse the input date (supporting multiple formats)
      let date
      if (searchDate.includes('/')) {
        // MM/DD/YYYY format
        const [month, day, year] = searchDate.split('/')
        // Validate the components
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        const yearNum = parseInt(year, 10)
        
        if (monthNum < 1 || monthNum > 12) throw new Error('Invalid month')
        if (dayNum < 1 || dayNum > 31) throw new Error('Invalid day')
        if (yearNum < 1900 || yearNum > 9999) throw new Error('Invalid year')
        
        // Create date using UTC to avoid timezone issues
        date = new Date(yearNum, monthNum - 1, dayNum)
        
        // Verify if the date is valid (e.g., not like 02/31/2025)
        if (date.getMonth() !== monthNum - 1) {
          throw new Error('Invalid date for the given month')
        }
      } else if (searchDate.includes('-')) {
        // YYYY-MM-DD format
        const [year, month, day] = searchDate.split('-')
        // Validate the components
        const yearNum = parseInt(year, 10)
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        
        if (monthNum < 1 || monthNum > 12) throw new Error('Invalid month')
        if (dayNum < 1 || dayNum > 31) throw new Error('Invalid day')
        if (yearNum < 1900 || yearNum > 9999) throw new Error('Invalid year')
        
        // Create date using UTC to avoid timezone issues
        date = new Date(yearNum, monthNum - 1, dayNum)
        
        // Verify if the date is valid
        if (date.getMonth() !== monthNum - 1) {
          throw new Error('Invalid date for the given month')
        }
      } else {
        throw new Error('Invalid date format')
      }

      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }

      // Set the current month to show the searched date
      setCurrentMonth(date)
      // Highlight the searched date
      setSelectedDate(date)
      setSelectedEvents(eventsByDate[format(date, 'yyyy-MM-dd')] || [])
      // Show the day name with the correct format
      const formattedDate = format(date, 'EEEE, MMMM d, yyyy')
      setSearchResult(formattedDate)
    } catch (error) {
      if (error.message.startsWith('Invalid')) {
        setSearchResult(error.message)
      } else {
        setSearchResult('Invalid date format. Please use MM/DD/YYYY or YYYY-MM-DD')
      }
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const rows = []
  let days = []
  let day = startDate

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day)
      day = addDays(day, 1)
    }
    rows.push(days)
    days = []
  }

  function prevMonth() {
    setCurrentMonth(subMonths(currentMonth, 1))
  }
  function nextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const today = new Date()

  return (
    <div className={`calendar-container month-${format(monthStart, 'MMMM')}`}>
      <form className="search-container" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Search date (MM/DD/YYYY or YYYY-MM-DD)"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
        />
        <button type="submit" className="search-button">
          Find Date
        </button>
        {searchResult && (
          <div className="search-result">
            {searchResult}
          </div>
        )}
      </form>

      <div className="calendar-header">
        <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">&lt;</button>
        <div className="month-title">
          <div className="month">{format(monthStart, 'MMMM')}</div>
          <div className="year">{format(monthStart, 'yyyy')}</div>
        </div>
        <button className="nav-btn" onClick={nextMonth} aria-label="Next month">&gt;</button>
      </div>

      <div className="weekdays">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="weekday">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {rows.map((week, wi) => (
          <div key={wi} className="week-row">
            {week.map((d, di) => {
              const iso = format(d, 'yyyy-MM-dd')
              const dayEvents = eventsByDate[iso] || []
              const eventsWithConflicts = detectConflicts(dayEvents)
              const isToday = isSameDay(d, today)
              const inMonth = isSameMonth(d, monthStart)

              return (
                <div
                  key={di}
                  className={`day-cell ${inMonth ? '' : 'muted'} ${isToday ? 'today' : ''}`}
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedEvents(eventsWithConflicts);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="date-number">{format(d, 'd')}</div>

                  <div className="events-list">
                    {eventsWithConflicts.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`event-item ${ev.conflict ? 'conflict' : ''}`}
                        style={{ '--event-color': ev.color }}
                        title={`${ev.title} — ${ev.startTime} to ${ev.endTime}`}
                      >
                        <span className="event-time">
                          {ev.startTime} - {ev.endTime}
                        </span>
                        <span className="event-title">{ev.title}</span>
                      </div>
                    ))}

                    {eventsWithConflicts.length > 3 && (
                      <div className="more-indicator">+{eventsWithConflicts.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="legend">
        <span className="legend-item"><span className="dot"></span>Event</span>
        <span className="legend-item"><span className="dot conflict-dot"></span>Conflict</span>
        <span className="legend-item today-legend">Today highlighted</span>
      </div>

      {/* Modal */}
      <div 
        className={`modal-overlay ${selectedDate ? 'active' : ''}`}
        onClick={(e) => {
          if (e.target.classList.contains('modal-overlay')) {
            setSelectedDate(null);
            setSelectedEvents([]);
          }
        }}
      >
        {selectedDate && (
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                {format(selectedDate, 'MMMM d, yyyy')}
              </div>
              <button 
                className="modal-close"
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedEvents([]);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-events">
                {selectedEvents.map(ev => (
                  <div 
                    key={ev.id}
                    className="modal-event"
                    style={{ 
                      '--event-color': `${ev.color}20`,
                      '--event-color-dark': ev.color 
                    }}
                  >
                    <div className="modal-event-time">
                      {ev.startTime} - {ev.endTime}
                    </div>
                    <div className="modal-event-title">
                      {ev.title}
                    </div>
                  </div>
                ))}
              {selectedEvents.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No events scheduled for this day
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
