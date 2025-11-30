import React from 'react'
import Calendar from './components/Calendar'
import events from './events.json'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>My Calendar</h1>
        <p>Simple React calendar — loads events from static JSON</p>
      </header>
      <main>
        <Calendar initialEvents={events} />
      </main>
    </div>
  )
}
