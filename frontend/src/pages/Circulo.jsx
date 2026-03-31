import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Layout from '../components/Layout'

function formatarDuracao(s) {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60
  if(h>0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

export default function Circulo() {
  const { modoClaro: light } = useTheme()
  const { user } = useAuth()
  const [circle, setCircle] = useState(null)
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)
  const [circleName, setCircleName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/circles/me').then(r => setCircle(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!circle?._id) return
    api.get(`/circles/${circle._id}/stats?period=${period}`)
      .then(r => setStats(r.data))
      .catch(console.error)
  }, [circle, period])

  async function criarCirculo(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await api.post('/circles', { name: circleName })
      setCircle(r.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar círculo')
    }
  }

  async function entrarCirculo(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await api.post('/circles/join', { inviteCode })
      setCircle(r.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido')
    }
  }

  async function sairCirculo() {
    if (!confirm('Tem certeza que quer sair do círculo?')) return
    try {
      await api.post('/circles/leave')
      setCircle(null)
      setStats(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao sair')
    }
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(circle.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const card = `rounded-2xl p-4 sm:p-6 border ${light ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-950/85 border-white/10'}`
  const text = light ? 'text-black' : 'text-white'
  const subtext = light ? 'text-zinc-600' : 'text-zinc-400'
  const inputClass = `w-full rounded-xl px-4 py-2.5 border focus:outline-none transition ${light ? 'bg-white border-black/20 text-black placeholder-zinc-400' : 'bg-zinc-900 border-white/20 text-white placeholder-zinc-500'}`
  const btnPrimary = `font-bold py-2.5 px-6 rounded-xl transition ${light ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`

  if (loading) return <Layout><div className="flex justify-center h-64 items-center"><p className={subtext}>Carregando...</p></div></Layout>

  if (!circle) return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6 mt-8">
        <h1 className={`text-2xl font-extrabold ${text}`}>Círculo de treinos</h1>
        <p className={`text-sm ${subtext}`}>Crie um grupo com seus amigos para comparar frequência e histórico de treinos.</p>

        <div className={card}>
          <h2 className={`text-base font-bold mb-4 ${text}`}>Criar um círculo</h2>
          <form onSubmit={criarCirculo} className="space-y-3">
            <input type="text" placeholder="Nome do círculo" value={circleName} onChange={e => setCircleName(e.target.value)} required className={inputClass} />
            <button type="submit" className={`${btnPrimary} w-full`}>Criar</button>
          </form>
        </div>

        <div className={card}>
          <h2 className={`text-base font-bold mb-4 ${text}`}>Entrar em um círculo</h2>
          <form onSubmit={entrarCirculo} className="space-y-3">
            <input type="text" placeholder="Código de convite (ex: A1B2C3D4)" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required className={inputClass} />
            <button type="submit" className={`${btnPrimary} w-full`}>Entrar</button>
          </form>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </Layout>
  )

  const myStats = stats?.ranking?.find(r => String(r.user.id) === String(user?.id))
  const myCount = myStats?.count ?? 0

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header do círculo */}
        <div className={`${card} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div>
            <h1 className={`text-xl font-extrabold ${text}`}>⭕ {circle.name}</h1>
            <p className={`text-sm ${subtext}`}>{circle.members?.length} membro(s)</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-mono ${light ? 'bg-zinc-50 border-black/10' : 'bg-zinc-900 border-white/10'}`}>
              <span className={subtext}>Convite:</span>
              <span className={`font-bold ${text}`}>{circle.inviteCode}</span>
              <button onClick={copiarCodigo} className={`text-xs px-2 py-1 rounded-lg ${light ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'} transition`}>
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
            <button onClick={sairCirculo} className="text-xs text-red-400 hover:text-red-300 transition">Sair</button>
          </div>
        </div>

        {/* Seletor de período */}
        <div className="flex gap-2">
          {[['week','Semana'],['month','Mês'],['all','Tudo']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                period === v
                  ? (light ? 'bg-black text-white border-black' : 'bg-white text-black border-white')
                  : (light ? 'bg-white text-black border-black/15' : 'bg-zinc-900 text-white border-white/15')
              }`}
            >{l}</button>
          ))}
        </div>

        {/* Meu contador em destaque */}
        <div className={`${card} text-center`}>
          <p className={`text-sm ${subtext} mb-1`}>Você foi à academia</p>
          <p className={`text-6xl font-extrabold ${text}`}>{myCount}×</p>
          <p className={`text-sm ${subtext} mt-1`}>nesta {period === 'week' ? 'semana' : period === 'month' ? 'mês' : 'período'}</p>
        </div>

        {/* Ranking */}
        {stats?.ranking && (
          <div className={card}>
            <h2 className={`text-base font-bold mb-4 ${text}`}>🏆 Ranking</h2>
            <div className="space-y-3">
              {stats.ranking.map((r, i) => {
                const isMe = String(r.user.id) === String(user?.id)
                return (
                  <div key={String(r.user.id)} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                    isMe
                      ? (light ? 'bg-black text-white border-black' : 'bg-white text-black border-white')
                      : (light ? 'bg-zinc-50 border-black/10' : 'bg-zinc-900 border-white/10')
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-extrabold w-6 ${isMe ? '' : subtext}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}°`}
                      </span>
                      <div>
                        <p className={`font-semibold text-sm ${isMe ? (light ? 'text-white' : 'text-black') : text}`}>
                          {r.user.name} {isMe && '(você)'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xl font-extrabold ${isMe ? (light ? 'text-white' : 'text-black') : text}`}>
                      {r.count}×
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Feed de treinos do círculo */}
        {stats?.feed && stats.feed.length > 0 && (
          <div className={card}>
            <h2 className={`text-base font-bold mb-4 ${text}`}>📋 Treinos recentes no círculo</h2>
            <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {stats.feed.map((s, i) => (
                <li key={i} className={`rounded-xl px-3 py-2 border text-sm history-item ${light ? 'bg-zinc-50 border-black/10' : 'bg-zinc-900 border-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${text}`}>{s.userName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${light ? 'bg-black/5' : 'bg-white/10'} ${subtext}`}>Treino {s.tipo === 'A' ? 'Ollie' : 'Bibia'}</span>
                  </div>
                  <span className={`block text-xs mt-0.5 ${subtext}`}>
                    {new Date(s.finalizadoEm || s.createdAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} • {s.exerciciosFeitos}/{s.exerciciosTotais} exercícios • {formatarDuracao(s.duracaoSegundos || 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </Layout>
  )
}
