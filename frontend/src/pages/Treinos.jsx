import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Layout from '../components/Layout'

function obterDataLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}
function chaveExercicio(tipo, dia, exercicio) { return `${tipo}__${dia}__${exercicio}` }
function normalizarSeries(v) { const n = parseInt(v,10); return isNaN(n)||n<0?0:n }
function formatarDuracao(s) {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60
  if(h>0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

export default function Treinos() {
  const { modoClaro } = useTheme()
  const { user } = useAuth()
  const progressKey = `progressoTreino_${user?.id}`
  const andamentoKey = `treinosAndamento_${user?.id}`
  const dateKey = `ultimaDataAtiva_${user?.id}`

  const [treinos, setTreinos] = useState({ A: [], B: [] })
  const [treinoAtivo, setTreinoAtivo] = useState(() => localStorage.getItem(`treinoAtivo_${user?.id}`) || 'A')
  const [progresso, setProgresso] = useState({})
  const [andamento, setAndamento] = useState({ A: null, B: null })
  const [sessoes, setSessoes] = useState([])
  const [agoraMs, setAgoraMs] = useState(Date.now())
  const [carregando, setCarregando] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get('/workouts'),
      api.get('/sessions')
    ]).then(([r1, r2]) => {
      setTreinos(r1.data)
      setSessoes(r2.data)
    }).catch(console.error).finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    const hoje = obterDataLocal()
    const ultimaData = localStorage.getItem(dateKey)
    let prog = {}
    try { prog = JSON.parse(localStorage.getItem(progressKey)) || {} } catch {}
    let and = { A: null, B: null }
    try { and = JSON.parse(localStorage.getItem(andamentoKey)) || { A: null, B: null } } catch {}

    if (ultimaData && ultimaData !== hoje) {
      const resetado = {}
      Object.keys(prog).forEach(k => { resetado[k] = { feito: false, series: 0 } })
      prog = resetado
      localStorage.setItem(progressKey, JSON.stringify(prog))
      localStorage.setItem(dateKey, hoje)
    } else if (!ultimaData) {
      localStorage.setItem(dateKey, hoje)
    }

    setProgresso(prog)
    setAndamento(and)
  }, [user?.id])

  useEffect(() => {
    const ativo = Object.values(andamento).some(Boolean)
    if (ativo && !timerRef.current) {
      timerRef.current = setInterval(() => setAgoraMs(Date.now()), 1000)
    } else if (!ativo && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if(timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [andamento])

  const salvarProgresso = useCallback((prog) => {
    localStorage.setItem(progressKey, JSON.stringify(prog))
  }, [progressKey])

  const salvarAndamento = useCallback((and) => {
    localStorage.setItem(andamentoKey, JSON.stringify(and))
  }, [andamentoKey])

  function getEstado(chave) { return progresso[chave] || { feito: false, series: 0 } }

  function toggleFeito(chave) {
    const atual = getEstado(chave)
    const novo = { ...progresso, [chave]: { ...atual, feito: !atual.feito } }
    setProgresso(novo)
    salvarProgresso(novo)
  }

  function setSeries(chave, valor) {
    const atual = getEstado(chave)
    const novo = { ...progresso, [chave]: { ...atual, series: normalizarSeries(valor) } }
    setProgresso(novo)
    salvarProgresso(novo)
  }

  function iniciarTreino() {
    if (andamento[treinoAtivo]) return
    const novo = { ...andamento, [treinoAtivo]: { iniciadoEm: new Date().toISOString() } }
    setAndamento(novo)
    salvarAndamento(novo)
  }

  async function finalizarTreino() {
    const sessao = andamento[treinoAtivo]
    if (!sessao) return
    const inicio = new Date(sessao.iniciadoEm)
    const fim = new Date()
    const duracao = Math.max(0, Math.floor((fim - inicio) / 1000))

    const dias = treinos[treinoAtivo] || []
    let feitos = 0, total = 0
    dias.forEach(dia => {
      dia.exercicios.forEach(ex => {
        total++
        const k = chaveExercicio(treinoAtivo, dia.dia, ex)
        if (progresso[k]?.feito) feitos++
      })
    })

    try {
      const res = await api.post('/sessions', {
        tipo: treinoAtivo,
        data: obterDataLocal(),
        iniciadoEm: inicio.toISOString(),
        finalizadoEm: fim.toISOString(),
        duracaoSegundos: duracao,
        exerciciosFeitos: feitos,
        exerciciosTotais: total
      })
      setSessoes(prev => [res.data, ...prev])
    } catch (err) {
      console.error('Erro ao salvar sessão:', err)
    }

    const novo = { ...andamento, [treinoAtivo]: null }
    setAndamento(novo)
    salvarAndamento(novo)
  }

  function getContador() {
    const s = andamento[treinoAtivo]
    if (!s) return '00:00'
    return formatarDuracao(Math.max(0, Math.floor((agoraMs - new Date(s.iniciadoEm).getTime()) / 1000)))
  }

  function getStatus() {
    return andamento[treinoAtivo]
      ? `Treino ${treinoAtivo === 'A' ? 'Ollie' : 'Bibia'} em andamento`
      : `Treino ${treinoAtivo === 'A' ? 'Ollie' : 'Bibia'} parado`
  }

  const historicoA = sessoes.filter(s => s.tipo === 'A').slice(0, 20)
  const historicoB = sessoes.filter(s => s.tipo === 'B').slice(0, 20)

  const light = modoClaro

  if (carregando) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className={light ? 'text-zinc-700' : 'text-zinc-300'}>Carregando...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Abas A/B */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {['A', 'B'].map(tab => (
          <button
            key={tab}
            onClick={() => { setTreinoAtivo(tab); localStorage.setItem(`treinoAtivo_${user?.id}`, tab) }}
            className={`w-full sm:w-auto font-bold py-3 px-8 rounded-xl transition-all shadow border ${
              treinoAtivo === tab
                ? (light ? 'bg-black text-white border-black' : 'bg-white text-black border-white')
                : (light ? 'bg-white text-black border-black/15' : 'bg-zinc-900 text-white border-white/15 opacity-90')
            }`}
          >
            Treino {tab === 'A' ? 'Ollie' : 'Bibia'} {andamento[tab] ? '• em andamento' : ''}
          </button>
        ))}
      </div>

      {/* Painel de status / cronômetro */}
      <div className={`rounded-2xl p-4 sm:p-5 border mb-6 ${light ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-950/85 border-white/10'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={`text-sm font-semibold ${light ? 'text-zinc-600' : 'text-zinc-300'}`}>{getStatus()}</p>
            <p className={`text-3xl font-extrabold ${light ? 'text-black' : 'text-white'}`}>{getContador()}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={iniciarTreino}
              disabled={!!andamento[treinoAtivo]}
              className={`font-bold py-3 px-6 rounded-xl transition-all shadow disabled:opacity-40 disabled:cursor-not-allowed ${light ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
              Iniciar treino
            </button>
            <button
              onClick={finalizarTreino}
              disabled={!andamento[treinoAtivo]}
              className={`font-bold py-3 px-6 rounded-xl transition-all shadow border disabled:opacity-40 disabled:cursor-not-allowed ${light ? 'bg-white text-black border-black/15 hover:bg-zinc-50' : 'bg-zinc-800 text-white border-white/15 hover:bg-zinc-700'}`}
            >
              Finalizar treino
            </button>
          </div>
        </div>
      </div>

      {/* Cards de exercícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {(treinos[treinoAtivo] || []).map((item, idx) => {
          const feitos = item.exercicios.filter(ex => progresso[chaveExercicio(treinoAtivo, item.dia, ex)]?.feito).length
          return (
            <div key={idx} className={`relative rounded-2xl p-4 sm:p-6 border shadow card ${light ? 'bg-white border-black/10' : 'bg-gradient-to-br from-zinc-900 to-black border-white/10'}`}>
              <h2 className={`text-xl font-bold mb-1 border-b pb-2 ${light ? 'text-black border-black/20' : 'text-white border-white/20'}`}>{item.dia}</h2>
              <p className={`text-xs mb-3 font-semibold ${light ? 'text-zinc-500' : 'text-zinc-300'}`}>Concluídos: {feitos}/{item.exercicios.length}</p>
              <ul className="space-y-2">
                {item.exercicios.map((ex) => {
                  const k = chaveExercicio(treinoAtivo, item.dia, ex)
                  const estado = getEstado(k)
                  return (
                    <li key={ex} className={`exercise-row rounded-xl px-3 py-3 ${estado.feito ? 'exercise-done' : ''} ${light ? 'bg-zinc-50 border-black/10' : 'bg-zinc-900/90'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={estado.feito}
                            onChange={() => toggleFeito(k)}
                            className="mt-1 h-4 w-4 accent-zinc-800"
                          />
                          <span className={`text-sm ${estado.feito ? 'line-through text-zinc-400' : (light ? 'text-zinc-800' : 'text-zinc-100')}`}>{ex}</span>
                        </label>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs ${light ? 'text-zinc-400' : 'text-zinc-400'}`}>Séries</span>
                          <input
                            type="number" min="0" max="20" inputMode="numeric"
                            value={estado.series}
                            onChange={e => setSeries(k, e.target.value)}
                            className={`series-input w-14 text-center border rounded-lg py-1 px-1 text-sm focus:outline-none ${light ? 'bg-white border-black/20 text-black' : 'bg-black/60 border-white/20 text-white'}`}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Histórico */}
      <div className={`rounded-2xl p-4 sm:p-6 border ${light ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-950/85 border-white/10'}`}>
        <h3 className={`text-lg font-bold mb-4 ${light ? 'text-black' : 'text-white'}`}>Histórico de treinos</h3>
        {!historicoA.length && !historicoB.length ? (
          <p className="text-sm text-zinc-400">Finalize um treino para registrar no histórico.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[{ label: 'Treino Ollie', items: historicoA }, { label: 'Treino Bibia', items: historicoB }].map(({ label, items }) => (
              <div key={label} className={`rounded-xl p-3 border ${light ? 'bg-zinc-50 border-black/10' : 'bg-black/40 border-white/10'}`}>
                <h4 className={`text-sm font-semibold mb-2 ${light ? 'text-black' : 'text-white'}`}>{label}</h4>
                {!items.length ? (
                  <p className="text-xs text-zinc-500">Sem registros ainda.</p>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {items.map((s, i) => (
                      <li key={i} className={`border rounded-xl px-3 py-2 text-sm history-item ${light ? 'bg-white border-black/10' : 'bg-zinc-900 border-white/10'}`}>
                        <span className={`font-semibold ${light ? 'text-black' : 'text-white'}`}>
                          {new Date(s.finalizadoEm || s.createdAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className={`block ${light ? 'text-zinc-700' : 'text-zinc-200'}`}>{s.exerciciosFeitos}/{s.exerciciosTotais} exercícios feitos</span>
                        <span className={`block ${light ? 'text-zinc-500' : 'text-zinc-400'}`}>Tempo: {formatarDuracao(s.duracaoSegundos || 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
