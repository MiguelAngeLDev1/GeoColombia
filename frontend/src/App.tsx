import { QueryProvider } from './components/QueryProvider'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <QueryProvider>
      <HomePage />
    </QueryProvider>
  )
}

export default App
