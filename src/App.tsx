// App.tsx
import BenchmarkHistogram from './components/BenchmarkHistogram'
import { VersionProvider } from './context/VersionContext'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    // VersionProvider wraps our entire app to provide context
    <VersionProvider>
      {/* ErrorBoundary helps catch and handle React errors gracefully */}
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 p-8">
          <BenchmarkHistogram />
        </div>
      </ErrorBoundary>
    </VersionProvider>
  )
}

export default App