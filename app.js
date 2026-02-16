const SENHA_MESTRA = "19072024";
const DB_TREINOS = "treinosDB";
const DB_VERSAO = 1;
const STORE_PROGRESSO = "progresso";
const STORE_HISTORICO = "historico";
const ULTIMA_DATA_ATIVA_KEY = "ultimaDataAtivaTreino";
const TREINOS_ANDAMENTO_KEY = "treinosEmAndamento";

const treinosIniciais = {
  A: [
    { dia: "Segunda-feira", exercicios: ["Supino Inclinado", "Supino Reto", "Voador", "Dumbbell Press", "Elevação Frontal"] },
    { dia: "Terça-feira", exercicios: ["Agachamento", "Afundo", "Adutora", "Extensora"] },
    { dia: "Quarta-feira", exercicios: ["Puxada Alta Neutra", "Remada Unilateral", "Pulldown", "Voador Invertido", "Barra Fixa"] },
    { dia: "Quinta-feira", exercicios: ["Flexora (cadeira)", "Mesa Flexora", "Stiff", "Panturrilha", "Abdutora"] },
    { dia: "Sexta-feira", exercicios: ["Elevação Lateral", "Desenvolvimento", "Tríceps Testa", "Tríceps Francês", "Rosca Martelo", "Rosca Scott"] },
    { dia: "Sábado", exercicios: ["Descanso ativo"], nota: true },
    { dia: "Domingo", exercicios: ["Corrida com a Bibia 🏃‍♂️"], nota: true }
  ],
  B: [
    { dia: "Segunda-feira", exercicios: ["Hack ou Smith", "Búlgaro", "Adutora", "Extensora"] },
    { dia: "Terça-feira", exercicios: ["Puxada Alta Triângulo", "Remada Máquina", "Puxada Invertida", "Rosca Martelo", "Rosca Scott"] },
    { dia: "Quarta-feira", exercicios: ["Panturrilha Sentada", "Elevação Lateral", "Elevação Frontal", "Desenvolvimento", "Cardio 2h"] },
    { dia: "Quinta-feira", exercicios: ["Stiff", "Flexora", "Elevação Pélvica", "Polia Cruzada", "Abdômen"] },
    { dia: "Sexta-feira", exercicios: ["Supino Inclinado", "Supino Reto", "Voador / Crucifixo", "Tríceps Polia", "Tríceps Francês"] },
    { dia: "Sábado", exercicios: ["Descanso ativo"], nota: true },
    { dia: "Domingo", exercicios: ["Corrida com Ollie 🐕"], nota: true }
  ]
};

const state = {
  isLogged: sessionStorage.getItem("isLogged") === "true",
  modoClaro: localStorage.getItem("modoTema") === "claro",
  senha: "",
  erroLogin: false,
  carregando: true,
  treinos: JSON.parse(localStorage.getItem("dadosTreino")) || treinosIniciais,
  treinoAtivo: localStorage.getItem("activeWorkout") || "A",
  progressoTreino: JSON.parse(localStorage.getItem("progressoTreino")) || {},
  historicoTreino: JSON.parse(localStorage.getItem("historicoTreino")) || [],
  treinosEmAndamento: obterTreinosAndamentoIniciais(),
  agoraMs: Date.now()
};

const refs = {
  root: document.getElementById("root"),
  db: null,
  timerId: null
};

function obterTreinosAndamentoIniciais() {
  const vazio = { A: null, B: null };

  try {
    const salvo = JSON.parse(localStorage.getItem(TREINOS_ANDAMENTO_KEY));
    if (salvo && typeof salvo === "object") {
      return {
        A: salvo.A || null,
        B: salvo.B || null
      };
    }

    const legado = JSON.parse(localStorage.getItem("treinoEmAndamento"));
    if (legado && (legado.treino === "A" || legado.treino === "B")) {
      return {
        A: legado.treino === "A" ? legado : null,
        B: legado.treino === "B" ? legado : null
      };
    }
  } catch (error) {
    console.error("Falha ao carregar sessões em andamento:", error);
  }

  return vazio;
}

function obterDataLocalAtual() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function obterChaveExercicio(tipoTreino, dia, exercicio) {
  return `${tipoTreino}__${dia}__${exercicio}`;
}

function normalizarSeries(valor) {
  const numero = parseInt(valor, 10);
  if (Number.isNaN(numero) || numero < 0) return 0;
  return numero;
}

function formatarDuracao(segundosTotais) {
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.floor((segundosTotais % 3600) / 60);
  const segundos = segundosTotais % 60;

  if (horas > 0) {
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
  }

  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function abrirBancoTreinos() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_TREINOS, DB_VERSAO);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PROGRESSO)) {
        db.createObjectStore(STORE_PROGRESSO, { keyPath: "chave" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORICO)) {
        db.createObjectStore(STORE_HISTORICO, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function lerTodosDoStore(db, nomeStore) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);
      return;
    }

    const tx = db.transaction(nomeStore, "readonly");
    const store = tx.objectStore(nomeStore);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function limparStore(db, nomeStore) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    const tx = db.transaction(nomeStore, "readwrite");
    tx.objectStore(nomeStore).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function salvarNoStore(db, nomeStore, valor) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    const tx = db.transaction(nomeStore, "readwrite");
    tx.objectStore(nomeStore).put(valor);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function aplicarTema() {
  document.body.classList.toggle("light-mode-body", state.modoClaro);
  localStorage.setItem("modoTema", state.modoClaro ? "claro" : "escuro");
}

function obterEstadoExercicio(chave) {
  return state.progressoTreino[chave] || { feito: false, series: 0 };
}

function contarExerciciosFeitosPorTreino(tipoTreino) {
  return Object.entries(state.progressoTreino).reduce((total, [chave, estado]) => {
    if (!chave.startsWith(`${tipoTreino}__`)) return total;
    return total + (estado.feito ? 1 : 0);
  }, 0);
}

function contarExerciciosTotaisDoTreino(tipoTreino) {
  return (state.treinos[tipoTreino] || []).reduce((total, dia) => total + dia.exercicios.length, 0);
}

function getStatusTreino() {
  const sessao = state.treinosEmAndamento[state.treinoAtivo];
  if (!sessao) return `Treino ${state.treinoAtivo === "A" ? "Ollie" : "Bibia"} parado`;
  return `Treino ${sessao.treino === "A" ? "Ollie" : "Bibia"} em andamento`;
}

function getContadorTreino() {
  const sessao = state.treinosEmAndamento[state.treinoAtivo];
  if (!sessao) return "00:00";
  const inicio = new Date(sessao.iniciadoEm).getTime();
  const segundos = Math.max(0, Math.floor((state.agoraMs - inicio) / 1000));
  return formatarDuracao(segundos);
}

function getHistoricoSeparado() {
  const registros = [...state.historicoTreino]
    .filter((item) => item.tipo === "resumo")
    .reverse();

  return {
    A: registros.filter((item) => item.treino === "A").slice(0, 20),
    B: registros.filter((item) => item.treino === "B").slice(0, 20)
  };
}

function salvarTreinos() {
  localStorage.setItem("dadosTreino", JSON.stringify(state.treinos));
}

function salvarTreinoAtivo() {
  localStorage.setItem("activeWorkout", state.treinoAtivo);
}

function salvarProgresso() {
  localStorage.setItem("progressoTreino", JSON.stringify(state.progressoTreino));

  const db = refs.db;
  if (!db) return;

  const registros = Object.entries(state.progressoTreino).map(([chave, estado]) => ({
    chave,
    feito: !!estado.feito,
    series: Number(estado.series) || 0
  }));

  limparStore(db, STORE_PROGRESSO)
    .then(() => Promise.all(registros.map((item) => salvarNoStore(db, STORE_PROGRESSO, item))))
    .catch((error) => console.error("Falha ao salvar progresso:", error));
}

function salvarHistorico() {
  const limitados = state.historicoTreino.slice(-300);
  if (limitados.length !== state.historicoTreino.length) {
    state.historicoTreino = limitados;
  }

  localStorage.setItem("historicoTreino", JSON.stringify(state.historicoTreino));

  const db = refs.db;
  if (!db) return;

  limparStore(db, STORE_HISTORICO)
    .then(() => Promise.all(state.historicoTreino.map((item) => {
      const { id, ...resto } = item;
      return salvarNoStore(db, STORE_HISTORICO, resto);
    })))
    .catch((error) => console.error("Falha ao salvar histórico:", error));
}

function salvarTreinosEmAndamento() {
  localStorage.setItem(TREINOS_ANDAMENTO_KEY, JSON.stringify(state.treinosEmAndamento));
  localStorage.removeItem("treinoEmAndamento");
}

function ensureTimer() {
  const existeTreinoAtivo = Object.values(state.treinosEmAndamento).some((sessao) => !!sessao);

  if (!existeTreinoAtivo) {
    if (refs.timerId) {
      clearInterval(refs.timerId);
      refs.timerId = null;
    }
    atualizarContadorUI();
    return;
  }

  if (refs.timerId) return;

  refs.timerId = setInterval(() => {
    state.agoraMs = Date.now();
    atualizarContadorUI();
  }, 1000);
}

function editarCard(index) {
  const item = state.treinos[state.treinoAtivo][index];
  const novosExercicios = window.prompt("Edite os exercícios (separe por vírgula):", item.exercicios.join(", "));
  if (novosExercicios === null) return;

  const atualizados = novosExercicios
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  state.treinos[state.treinoAtivo][index] = { ...item, exercicios: atualizados };
  salvarTreinos();
  renderApp();
}

function iniciarTreino() {
  if (state.treinosEmAndamento[state.treinoAtivo]) return;

  state.treinosEmAndamento[state.treinoAtivo] = {
    treino: state.treinoAtivo,
    iniciadoEm: new Date().toISOString()
  };

  salvarTreinosEmAndamento();
  ensureTimer();
  renderApp();
}

function finalizarTreino() {
  const sessaoAtiva = state.treinosEmAndamento[state.treinoAtivo];
  if (!sessaoAtiva) return;

  const inicio = new Date(sessaoAtiva.iniciadoEm).getTime();
  const fim = Date.now();
  const segundos = Math.max(0, Math.floor((fim - inicio) / 1000));
  const tipoTreino = sessaoAtiva.treino;

  const resumo = {
    tipo: "resumo",
    treino: tipoTreino,
    data: obterDataLocalAtual(),
    feitos: contarExerciciosFeitosPorTreino(tipoTreino),
    total: contarExerciciosTotaisDoTreino(tipoTreino),
    duracaoSegundos: segundos,
    iniciadoEm: sessaoAtiva.iniciadoEm,
    finalizadoEm: new Date().toISOString()
  };

  state.historicoTreino.push(resumo);
  state.treinosEmAndamento[state.treinoAtivo] = null;

  salvarHistorico();
  salvarTreinosEmAndamento();
  ensureTimer();
  renderApp();
}

function realizarLogin() {
  const input = document.getElementById("password-input");
  const senhaDigitada = input ? input.value : "";

  if (senhaDigitada === SENHA_MESTRA) {
    sessionStorage.setItem("isLogged", "true");
    state.isLogged = true;
    state.erroLogin = false;
    state.senha = "";
    renderApp();
    return;
  }

  state.erroLogin = true;
  state.senha = "";
  renderApp();
}

function logout() {
  sessionStorage.removeItem("isLogged");
  state.isLogged = false;
  renderApp();
}

function renderHistoricoLista(itens, prefixo) {
  if (!itens.length) {
    return `<p class="text-xs sm:text-sm text-zinc-500">Sem registros ainda.</p>`;
  }

  const htmlItens = itens.map((item, index) => {
    const data = new Date(item.finalizadoEm || item.data).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    return `
      <li class="history-item border border-white/10 bg-zinc-900 rounded-xl px-3 py-2 text-sm" data-key="${prefixo}-${index}">
        <span class="font-semibold text-white">${data}</span>
        <span class="block text-zinc-200">${item.feitos}/${item.total} exercícios feitos</span>
        <span class="block text-zinc-400">Tempo: ${formatarDuracao(Number(item.duracaoSegundos) || 0)}</span>
      </li>
    `;
  }).join("");

  return `<ul class="space-y-2 max-h-80 overflow-y-auto pr-1">${htmlItens}</ul>`;
}

function renderLogin() {
  return `
    <div id="login-screen" class="fixed inset-0 z-50 flex items-center justify-center p-6 ${state.modoClaro ? "login-light" : "bg-black"}">
      <div class="login-card bg-zinc-950 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center fade-in">
        <div class="mb-6 flex justify-center">
          <div class="login-icon-wrap bg-white/10 p-4 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 class="login-title text-2xl font-bold text-white mb-2">Acesso ao Treino</h2>
        <p class="login-subtitle text-zinc-300 mb-6">Digite sua senha para continuar</p>
        <input id="password-input" type="password" value="" class="login-input w-full p-4 border-2 border-white/20 bg-black/60 text-white rounded-xl mb-4 focus:border-white outline-none text-center text-xl tracking-widest" placeholder="****">
        <button data-action="login" class="login-main-btn w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">Entrar</button>
        <button data-action="toggle-theme" class="theme-toggle-btn w-full mt-3 font-semibold py-3 rounded-xl transition-all border border-white/20 text-zinc-200 hover:bg-white/10">${state.modoClaro ? "Modo escuro" : "Modo claro"}</button>
        <p class="${state.erroLogin ? "" : "hidden"} text-red-300 mt-4 text-sm font-medium">Senha incorreta. Tente novamente.</p>
      </div>
    </div>
  `;
}

function renderMainApp() {
  const historicoSeparado = getHistoricoSeparado();
  const semHistorico = !historicoSeparado.A.length && !historicoSeparado.B.length;

  const cardsHtml = state.treinos[state.treinoAtivo].map((item, index) => {
    const totalFeitos = item.exercicios.reduce((total, exercicio) => {
      const chave = obterChaveExercicio(state.treinoAtivo, item.dia, exercicio);
      return total + (obterEstadoExercicio(chave).feito ? 1 : 0);
    }, 0);

    const exerciciosHtml = item.exercicios.map((exercicio) => {
      const chave = obterChaveExercicio(state.treinoAtivo, item.dia, exercicio);
      const estado = obterEstadoExercicio(chave);
      const chaveCodificada = encodeURIComponent(chave);

      return `
        <li class="exercise-row exercise-item ${estado.feito ? "exercise-done" : ""} bg-zinc-900/90 rounded-xl px-3 py-3">
          <div class="exercise-row-content flex items-start justify-between gap-3">
            <label class="flex items-start gap-2 flex-1 cursor-pointer">
              <input type="checkbox" data-action="toggle-feito" data-chave="${chaveCodificada}" class="mt-1 h-4 w-4 accent-white" ${estado.feito ? "checked" : ""}>
              <span class="text-sm sm:text-base ${estado.feito ? "line-through text-zinc-500" : "text-zinc-100"}">${exercicio}</span>
            </label>
            <div class="series-control flex items-center gap-2 shrink-0">
              <span class="text-xs text-zinc-400">Séries</span>
              <input type="number" min="0" max="20" step="1" inputmode="numeric" value="${estado.series}" data-action="series" data-chave="${chaveCodificada}" class="series-input w-16 text-center border border-white/20 bg-black/60 text-white rounded-lg py-1 px-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
            </div>
          </div>
        </li>
      `;
    }).join("");

    return `
      <div class="card workout-card ${item.nota ? "bg-zinc-900" : "bg-gradient-to-br from-zinc-900 to-black"} border border-white/10 rounded-2xl p-4 sm:p-6">
        <button data-action="edit-day" data-index="${index}" class="absolute top-2 right-2 text-zinc-300 hover:text-white text-xs font-bold">EDITAR</button>
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-2 border-b-2 border-white/20 pb-2">${item.dia}</h2>
        <p class="text-xs sm:text-sm text-zinc-300 mb-4 font-semibold">Concluídos: ${totalFeitos}/${item.exercicios.length}</p>
        <ul class="space-y-2 text-left">${exerciciosHtml}</ul>
      </div>
    `;
  }).join("");

  return `
    <div id="app-content" class="app-shell container mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8 ${state.modoClaro ? "theme-light" : ""}">
      <div class="relative z-10">
        <header class="text-center mb-8 mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 class="app-title text-3xl sm:text-5xl font-extrabold text-white">Treinos</h1>
          <div class="flex items-center gap-2">
            <button data-action="toggle-theme" class="theme-toggle-btn px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 text-zinc-200 hover:text-white hover:bg-white/10 transition-colors">${state.modoClaro ? "Modo escuro" : "Modo claro"}</button>
            <button data-action="logout" class="logout-btn text-zinc-200 font-semibold hover:text-white transition-colors">Sair</button>
          </div>
        </header>

        <div class="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button id="btnA" data-action="switch-tab" data-tab="A" class="w-full sm:w-auto font-bold py-3 px-6 sm:px-8 rounded-xl transition-all shadow-md border border-white/15 ${state.treinoAtivo === "A" ? "bg-white text-black" : "bg-zinc-900 text-white opacity-90"}">
            Treino Ollie ${state.treinosEmAndamento.A ? "• em andamento" : ""}
          </button>
          <button id="btnB" data-action="switch-tab" data-tab="B" class="w-full sm:w-auto font-bold py-3 px-6 sm:px-8 rounded-xl transition-all shadow-md border border-white/15 ${state.treinoAtivo === "B" ? "bg-white text-black" : "bg-zinc-900 text-white opacity-90"}">
            Treino Bibia ${state.treinosEmAndamento.B ? "• em andamento" : ""}
          </button>
        </div>

        <section class="panel-surface bg-zinc-950/85 backdrop-blur rounded-2xl p-4 sm:p-5 shadow-sm border border-white/10 mb-6 sm:mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p id="status-treino" class="text-sm sm:text-base font-semibold text-zinc-300">${getStatusTreino()}</p>
              <p id="contador-treino" class="text-2xl sm:text-3xl font-extrabold text-white">${getContadorTreino()}</p>
            </div>
            <div class="session-actions flex flex-col sm:flex-row gap-3">
              <button id="btn-iniciar" data-action="start-workout" class="start-btn w-full sm:w-auto bg-white hover:bg-zinc-200 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" ${state.treinosEmAndamento[state.treinoAtivo] ? "disabled" : ""}>Iniciar treino</button>
              <button id="btn-finalizar" data-action="finish-workout" class="finish-btn w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md border border-white/15 disabled:opacity-50 disabled:cursor-not-allowed" ${state.treinosEmAndamento[state.treinoAtivo] ? "" : "disabled"}>Finalizar treino</button>
            </div>
          </div>
        </section>

        <main class="space-y-6 sm:space-y-8">
          <section id="treino-container">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 fade-in">${cardsHtml}</div>
          </section>

          <section id="historico-container" class="panel-surface bg-zinc-950/85 backdrop-blur rounded-2xl p-4 sm:p-6 shadow-sm border border-white/10">
            <h3 class="text-lg sm:text-xl font-bold text-white mb-3">Histórico separado por treino</h3>
            ${semHistorico ? `<p class="text-sm text-zinc-400">Finalize um treino para registrar no histórico diário.</p>` : `
              <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div class="history-subpanel bg-black/40 border border-white/10 rounded-xl p-3">
                  <h4 class="text-sm sm:text-base font-semibold text-white mb-2">Treino Ollie</h4>
                  ${renderHistoricoLista(historicoSeparado.A, "A")}
                </div>
                <div class="history-subpanel bg-black/40 border border-white/10 rounded-xl p-3">
                  <h4 class="text-sm sm:text-base font-semibold text-white mb-2">Treino Bibia</h4>
                  ${renderHistoricoLista(historicoSeparado.B, "B")}
                </div>
              </div>
            `}
          </section>
        </main>
      </div>
    </div>
  `;
}

function atualizarContadorUI() {
  const status = document.getElementById("status-treino");
  const contador = document.getElementById("contador-treino");
  const btnIniciar = document.getElementById("btn-iniciar");
  const btnFinalizar = document.getElementById("btn-finalizar");
  const btnA = document.getElementById("btnA");
  const btnB = document.getElementById("btnB");

  if (status) status.textContent = getStatusTreino();
  if (contador) contador.textContent = getContadorTreino();

  const ativo = !!state.treinosEmAndamento[state.treinoAtivo];
  if (btnIniciar) btnIniciar.disabled = ativo;
  if (btnFinalizar) btnFinalizar.disabled = !ativo;

  if (btnA) btnA.textContent = `Treino Ollie ${state.treinosEmAndamento.A ? "• em andamento" : ""}`;
  if (btnB) btnB.textContent = `Treino Bibia ${state.treinosEmAndamento.B ? "• em andamento" : ""}`;
}

function renderApp() {
  aplicarTema();

  if (state.carregando) {
    refs.root.innerHTML = `<div class="min-h-screen w-full flex items-center justify-center p-6"><p class="${state.modoClaro ? "text-zinc-800" : "text-zinc-100"} font-semibold">Carregando...</p></div>`;
    return;
  }

  refs.root.innerHTML = state.isLogged ? renderMainApp() : renderLogin();
  ensureTimer();
}

async function inicializarDados() {
  try {
    refs.db = await abrirBancoTreinos();

    if (refs.db) {
      const progressoBanco = await lerTodosDoStore(refs.db, STORE_PROGRESSO);
      if (progressoBanco.length) {
        state.progressoTreino = progressoBanco.reduce((acc, item) => {
          acc[item.chave] = { feito: !!item.feito, series: Number(item.series) || 0 };
          return acc;
        }, {});
      }

      const historicoBanco = await lerTodosDoStore(refs.db, STORE_HISTORICO);
      if (historicoBanco.length) {
        state.historicoTreino = historicoBanco;
      }
    }

    const hoje = obterDataLocalAtual();
    const ultimaDataAtiva = localStorage.getItem(ULTIMA_DATA_ATIVA_KEY);
    if (!ultimaDataAtiva) {
      localStorage.setItem(ULTIMA_DATA_ATIVA_KEY, hoje);
    } else if (ultimaDataAtiva !== hoje) {
      const resetado = {};
      Object.keys(state.progressoTreino).forEach((chave) => {
        resetado[chave] = { feito: false, series: 0 };
      });
      state.progressoTreino = resetado;
      localStorage.setItem(ULTIMA_DATA_ATIVA_KEY, hoje);
      salvarProgresso();
    }
  } catch (error) {
    console.error("Falha ao inicializar app JS:", error);
  } finally {
    state.carregando = false;
    renderApp();
  }
}

function handleRootClick(event) {
  const alvo = event.target.closest("[data-action]");
  if (!alvo) return;

  const acao = alvo.dataset.action;

  if (acao === "login") {
    realizarLogin();
    return;
  }

  if (acao === "toggle-theme") {
    state.modoClaro = !state.modoClaro;
    renderApp();
    return;
  }

  if (acao === "logout") {
    logout();
    return;
  }

  if (!state.isLogged) return;

  if (acao === "switch-tab") {
    const tab = alvo.dataset.tab;
    if (tab === "A" || tab === "B") {
      state.treinoAtivo = tab;
      salvarTreinoAtivo();
      renderApp();
    }
    return;
  }

  if (acao === "start-workout") {
    iniciarTreino();
    return;
  }

  if (acao === "finish-workout") {
    finalizarTreino();
    return;
  }

  if (acao === "edit-day") {
    const index = Number(alvo.dataset.index);
    if (!Number.isNaN(index)) {
      editarCard(index);
    }
  }
}

function handleRootChange(event) {
  if (!state.isLogged) return;

  const alvo = event.target;
  const acao = alvo.dataset.action;
  if (!acao) return;

  const chaveCodificada = alvo.dataset.chave;
  if (!chaveCodificada) return;

  const chave = decodeURIComponent(chaveCodificada);
  const estadoAtual = obterEstadoExercicio(chave);

  if (acao === "toggle-feito") {
    state.progressoTreino[chave] = { ...estadoAtual, feito: alvo.checked };
    salvarProgresso();
    renderApp();
    return;
  }

  if (acao === "series") {
    const series = normalizarSeries(alvo.value);
    state.progressoTreino[chave] = { ...estadoAtual, series };
    salvarProgresso();
    renderApp();
  }
}

function handleRootKeydown(event) {
  if (event.key !== "Enter") return;
  if (event.target.id === "password-input") {
    realizarLogin();
  }
}

function bootstrap() {
  refs.root.addEventListener("click", handleRootClick);
  refs.root.addEventListener("change", handleRootChange);
  refs.root.addEventListener("keydown", handleRootKeydown);

  renderApp();
  inicializarDados();
}

bootstrap();
