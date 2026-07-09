import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const successMsg = location.state?.success
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.token, data.user)
      navigate('/treinos')
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="treinosOnline" className="w-16 h-16 mb-3 rounded-2xl object-cover shadow-lg" />
          <h1 className="text-2xl font-bold tracking-tight text-white">treinosOnline</h1>
          <p className="text-neutral-400 text-sm mt-1">Bem-vindo de volta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {successMsg && <p className="text-green-400 text-sm text-center">{successMsg}</p>}
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-neutral-300 hover:text-white transition">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
