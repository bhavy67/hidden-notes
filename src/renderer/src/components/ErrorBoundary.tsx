import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GhostPad] Render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center rounded-xl gap-2"
          style={{ background: 'rgba(30,30,35,0.96)' }}>
          <p className="text-sm font-medium text-gray-200">Something went wrong</p>
          <p className="text-xs text-gray-400">Restart GhostPad to recover</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 px-3 py-1 text-xs text-gray-200 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
