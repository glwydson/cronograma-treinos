import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Layout from '../components/Layout'

function obterDataLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}
function chaveExercicio(planId, dia, exercicio) { return `${planId}__${dia}__${exercicio}` }
function normalizarSeries(v) { const n = parseInt(v,10); return isNaN(n)||n<0?0:n }
function formatarDuracao(s) {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60
  if(h>0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

export default function Treinos() {
  const { modoClaro } = useTheme()
  const { user } = useAuth()
  const progressKey = `prog_${user?.id}`
  const andamentoKey = `and_${user?.id}`
  const dateKey = `date_${user?.id}`
  const activePlanKey = `activePlan_${user?.id}`

  const [plans, setPlans] = useState([])
  const [activePlanId, setActivePlanId] = useState(() => localStorage.getItem(activePlanKey) || null)
  const [progresso, setProgresso] = useState({})
  const [andamento, setAndamento] = useState({})
  const [sessoes, setSessoes] = useState([])
  const [agoraMs, setAgoraMs] = useState(Date.now())
  const [carregando, setCarregando] = useState(true)
  const [showNewPlanForm, setShowNewPlanForm] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [creating, setCreating] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    Promise.all([api.get('/workouts'), api.get('/sessions')])
      .then(([r1, r2]) => {
        setPlans(r1.data)
        setSessoes(r2.data)
        if (r1.data.length > 0) {
          const saved = localStorage.getItem(activePlanKey)
          const valid = r1.data.find(p => p._id === saved)
          setActivePlanId(valid ? valid._id : r1.data[0]._id)
        }
      })
      .catch(console.error)
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    const hoje = obterDataLocal()
    const ultimaData = localStorage.getItem(dateKey)
    let prog = {}
    try { prog = JSON.parse(localStorage.getItem(progressKey)) || {} } catch {}
    let and = {}
    try { and = JSON.parse(localStorage.getItem(andamentoKey)) || {} } catch {}

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

  const salvarProgresso = useCallback((prog) => localStorage.setItem(progressKey, JSON.stringify(prog)), [progressKey])
  const salvarAndamento = useCallback((and) => localStorage.setItem(andamentoKey, JSON.stringify(and)), [andamentoKey])

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

  function selectPlan(id) {
    setActivePlanId(id)
    localStorage.setItem(activePlanKey, id)
  }

  function iniciarTreino() {
    if (!activePlanId || andamento[activePlanId]) return
    const novo = { ...andamento, [activePlanId]: { iniciadoEm: new Date().toISOString() } }
    setAndamento(novo)
    salvarAndamento(novo)
  }

  async function finalizarTreino() {
    const sessao = andamento[activePlanId]
    if (!sessao) return
    const plan = plans.find(p => p._id === activePlanId)
    const inicio = new Date(sessao.iniciadoEm)
    const fim = new Date()
    const duracao = Math.max(0, Math.floor((fim - inicio) / 1000))

    let feitos = 0, total = 0
    ;(plan?.days || []).forEach(dia => {
      dia.exercicios.forEach(ex => {
        total++
        if (progresso[chaveExercicio(activePlanId, dia.dia, ex)]?.feito) feitos++
      })
    })

    try {
      const res = await api.post('/sessions', {
        tipo: plan?.name || activePlanId,
        data: obterDataLocal(),
        iniciadoEm: inicio.toISOString(),
        finalizadoEm: fim.toISOString(),
        duracaoSegundos: duracao,
        exerciciosFeitos: feitos,
        exerciciosTotais: total
      })
      setSessoes(prev => [res.data, ...prev])
    } catch (err) { console.error('Erro ao salvar sessão:', err) }

    const novo = { ...andamento, [activePlanId]: null }
    setAndamento(novo)
    salvarAndamento(novo)
  }

  async function criarPlano(e) {
    e.preventDefault()
    if (!newPlanName.trim()) return
    setCreating(true)
    try {
      const res = await api.post('/workouts', { name: newPlanName.trim(), days: [] })
      setPlans(prev => [...prev, res.data])
      selectPlan(res.data._id)
      setNewPlanName('')
      setShowNewPlanForm(false)
    } catch (err) { console.error(err) }
    finally { setCreating(false) }
  }

  function getContador() {
    const s = andamento[activePlanId]
    if (!s) return '00:00'
    return formatarDuracao(Math.max(0, Math.floor((agoraMs - new Date(s.iniciadoEm).getTime()) / 1000)))
  }

  const activePlan = plans.find(p => p._id === activePlanId)
  const sessoesDoPlanAtivo = sessoes.filter(s => s.tipo === activePlan?.name).slice(0, 20)
  const light = modoClaro
  const text = light ? 'text-black' : 'text-white'
  const subtext = light ? 'text-zinc-600' : 'text-zinc-400'
  const cardClass = `rounded-2xl p-4 sm:p-6 border ${light ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-950/85 border-white/10'}`

  if (carregando) return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <p className={subtext}>Carregando...</p>
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* Header de planos + botão novo */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {plans.map(plan => (
          <button
            key={plan._id}
            onClick={() => selectPlan(plan._id)}
            className={`font-bold py-2.5 px-6 rounded-xl transition-all shadow border text-sm ${
              activePlanId === plan._id
                ? (light ? 'bg-black text-white border-black' : 'bg-white text-black border-white')
                : (light ? 'bg-white text-black border-black/15 hover:border-black/30' : 'bg-zinc-900 text-white border-white/15 hover:border-white/30')
            }`}
          >
            {plan.name} {andamento[plan._id] ? '• ⏱' : ''}
          </button>
        ))}

        <button
          onClick={() => setShowNewPlanForm(v => !v)}
          className={`font-bold py-2.5 px-4 rounded-xl border transition-all text-sm ${
            light
              ? 'border-black/20 text-zinc-600 hover:text-black hover:border-black/40'
              : 'border-white/20 text-zinc-400 hover:text-white hover:border-white/40'
          }`}
        >
          ＋ Novo treino
        </button>
      </div>

      {/* Formulário de novo plano */}
      {showNewPlanForm && (
        <div className={`${cardClass} mb-6`}>
          <h3 className={`text-sm font-bold mb-3 ${text}`}>Nome do novo treino</h3>
          <form onSubmit={criarPlano} className="flex gap-3">
            <input
              type="text"
              value={newPlanName}
              onChange={e => setNewPlanName(e.target.value)}
              placeholder="Ex: Treino de Peito, Pernas, Full Body..."
              required
              autoFocus
              className={`flex-1 rounded-xl px-4 py-2.5 border focus:outline-none text-sm ${
                light ? 'bg-white border-black/20 text-black placeholder-zinc-400' : 'bg-zinc-900 border-white/20 text-white placeholder-zinc-500'
              }`}
            />
            <button
              type="submit"
              disabled={creating}
              className={`font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50 text-sm ${light ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
              {creating ? 'Criando...' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => setShowNewPlanForm(false)}
              className={`px-4 py-2.5 rounded-xl border text-sm ${light ? 'border-black/15 text-zinc-600' : 'border-white/15 text-zinc-400'}`}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Sem planos */}
      {plans.length === 0 && (
        <div className={`${cardClass} text-center py-16`}>
          <p className="text-4xl mb-4">🏋️</p>
          <p className={`text-lg font-bold mb-2 ${text}`}>Nenhum treino criado ainda</p>
          <p className={`text-sm mb-6 ${subtext}`}>Crie seu primeiro plano de treino para começar.</p>
          <button
            onClick={() => setShowNewPlanForm(true)}
            className={`font-bold px-8 py-3 rounded-xl transition ${light ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            ＋ Criar primeiro treino
          </button>
        </div>
      )}

      {/* Plano ativo selecionado */}
      {activePlan && (
        <>
          {/* Painel cronômetro */}
          <div className={`${cardClass} mb-6`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold ${subtext}`}>
                  {andamento[activePlanId] ? `${activePlan.name} em andamento` : `${activePlan.name} parado`}
                </p>
                <p className={`text-3xl font-extrabold ${text}`}>{getContador()}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={iniciarTreino}
                  disabled={!!andamento[activePlanId]}
                  className={`font-bold py-3 px-6 rounded-xl transition shadow disabled:opacity-40 disabled:cursor-not-allowed ${light ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
                >Iniciar treino</button>
                <button
                  onClick={finalizarTreino}
                  disabled={!andamento[activePlanId]}
                  className={`font-bold py-3 px-6 rounded-xl transition shadow border disabled:opacity-40 disabled:cursor-not-allowed ${light ? 'bg-white text-black border-black/15 hover:bg-zinc-50' : 'bg-zinc-800 text-white border-white/15 hover:bg-zinc-700'}`}
                >Finalizar treino</button>
              </div>
            </div>
          </div>

          {/* Dias do plano */}
          {activePlan.days.length === 0 ? (
            <div className={`${cardClass} text-center py-10 mb-6`}>
              <p className={`text-sm ${subtext}`}>Este treino ainda não tem dias configurados.</p>
              <p className={`text-xs mt-1 ${subtext}`}>Em breve: editar exercícios pela interface.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {activePlan.days.map((item, idx) => {
                const feitos = item.exercicios.filter(ex => progresso[chaveExercicio(activePlanId, item.dia, ex)]?.feito).length
                return (
                  <div key={idx} className={`relative rounded-2xl p-4 sm:p-6 border shadow card ${light ? 'bg-white border-black/10' : 'bg-gradient-to-br from-zinc-900 to-black border-white/10'}`}>
                    <h2 className={`text-xl font-bold mb-1 border-b pb-2 ${light ? 'text-black border-black/20' : 'text-white border-white/20'}`}>{item.dia}</h2>
                    <p className={`text-xs mb-3 font-semibold ${subtext}`}>Concluídos: {feitos}/{item.exercicios.length}</p>
                    <ul className="space-y-2">
                      {item.exercicios.map(ex => {
                        const k = chaveExercicio(activePlanId, item.dia, ex)
                        const estado = getEstado(k)
                        return (
                          <li key={ex} className={`exercise-row rounded-xl px-3 py-3 ${estado.feito ? 'exercise-done' : ''} ${light ? 'bg-zinc-50 border-black/10' : 'bg-zinc-900/90'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start gap-2 flex-1 cursor-pointer">
                                <input type="checkbox" checked={estado.feito} onChange={() => toggleFeito(k)} className="mt-1 h-4 w-4 accent-zinc-800" />
                                <span className={`text-sm ${estado.feito ? 'line-through text-zinc-400' : (light ? 'text-zinc-800' : 'text-zinc-100')}`}>{ex}</span>
                              </label>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-xs ${subtext}`}>Séries</span>
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
          )}

          {/* Histórico do plano ativo */}
          <div className={cardClass}>
            <h3 className={`text-lg font-bold mb-4 ${text}`}>Histórico — {activePlan.name}</h3>
            {sessoesDoPlanAtivo.length === 0 ? (
              <p className={`text-sm ${subtext}`}>Finalize um treino para registrar no histórico.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sessoesDoPlanAtivo.map((s, i) => (
                  <li key={i} className={`rounded-xl px-3 py-2 border text-sm history-item ${light ? 'bg-zinc-50 border-black/10' : 'bg-zinc-900 border-white/10'}`}>
                    <span className={`font-semibold ${text}`}>
                      {new Date(s.finalizadoEm || s.createdAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <span className={`block ${light ? 'text-zinc-700' : 'text-zinc-200'}`}>{s.exerciciosFeitos}/{s.exerciciosTotais} exercícios feitos</span>
                    <span className={`block ${subtext}`}>Tempo: {formatarDuracao(s.duracaoSegundos || 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
