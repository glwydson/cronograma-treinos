import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { modoClaro, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const linkClass = (path) =>
    `text-sm font-semibold transition-colors ${
      location.pathname === path
        ? 'text-white border-b-2 border-white pb-0.5'
        : modoClaro ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'
    }`

  return (
    <div className={`min-h-dvh ${modoClaro ? 'theme-light' : ''}`}>
      <header className={`sticky top-0 z-40 backdrop-blur border-b ${modoClaro ? 'bg-white/80 border-black/10' : 'bg-black/80 border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className={`font-extrabold text-lg ${modoClaro ? 'text-black' : 'text-white'}`}>🏋️ treinosOnline</span>
            <nav className="flex gap-4">
              <Link to="/treinos" className={linkClass('/treinos')}>Treinos</Link>
              <Link to="/circulo" className={linkClass('/circulo')}>Círculo</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs hidden sm:block ${modoClaro ? 'text-zinc-600' : 'text-zinc-400'}`}>{user?.name}</span>
            <button onClick={toggleTheme} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${modoClaro ? 'border-black/15 text-zinc-700 hover:bg-black/5' : 'border-white/20 text-zinc-300 hover:bg-white/10'}`}>
              {modoClaro ? '🌙 Escuro' : '☀️ Claro'}
            </button>
            <button onClick={handleLogout} className={`text-xs font-semibold transition-colors ${modoClaro ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'}`}>Sair</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
