// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
                    <details className="text-sm text-red-600">
                        <summary>Error details</summary>
                        <pre className="mt-2 whitespace-pre-wrap">
                            {this.state.error?.message}
                        </pre>
                    </details>
                </div>
            )
        }

        return this.props.children
    }
}