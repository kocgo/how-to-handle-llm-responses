import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Level1Page } from './pages/Level1Page'
import { Level2Page } from './pages/Level2Page'
import { Level3Page } from './pages/Level3Page'
import { Level4Page } from './pages/Level4Page'
import { Level5Page } from './pages/Level5Page'
import { Level6Page } from './pages/Level6Page'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/level/1" replace />} />
        <Route path="/level/1" element={<Level1Page />} />
        <Route path="/level/2" element={<Level2Page />} />
        <Route path="/level/3" element={<Level3Page />} />
        <Route path="/level/4" element={<Level4Page />} />
        <Route path="/level/5" element={<Level5Page />} />
        <Route path="/level/6" element={<Level6Page />} />
      </Routes>
    </BrowserRouter>
  )
}
