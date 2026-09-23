import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import PopoutApp from './PopoutApp'
import ErrorBoundary from './components/ErrorBoundary'

const params = new URLSearchParams(window.location.search)
const isPopout = params.get('popout') === 'true'
const popoutNoteId = params.get('noteId') ?? ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isPopout ? <PopoutApp noteId={popoutNoteId} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
)
