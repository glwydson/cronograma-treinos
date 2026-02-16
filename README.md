# Treinos

Site de cronograma de treinos com login, controle de exercícios por dia, séries, histórico e cronômetro por treino.

## Funcionalidades

- Login com senha
- Dois treinos separados (`Ollie` e `Bibia`)
- Início/finalização de treino independentes por aba (podem rodar simultaneamente)
- Check por exercício e controle de séries
- Histórico separado por treino com:
  - data
  - quantidade de exercícios feitos
  - tempo de treino
- Modo claro/escuro com persistência
- Reset automático diário dos checks/séries
- Persistência local com `IndexedDB` + fallback em `localStorage`

## Estrutura do projeto

- `index.html` → entrada da aplicação
- `styles.css` → estilos globais e temas
- `app.js` → lógica da aplicação (UI, estado e persistência)
- `manifest.json` → metadados PWA
- `service-worker.json` → arquivo de cache offline (se usado no deploy)
- `.gitignore` → arquivos/pastas ignorados no Git

## Como usar

1. Abra o arquivo `index.html` no navegador
2. Faça login com a senha configurada no `app.js`:
   - `SENHA_MESTRA = "19072024"`
3. Selecione a aba de treino (`Ollie` ou `Bibia`)
4. Clique em **Iniciar treino**
5. Marque os exercícios e ajuste as séries
6. Clique em **Finalizar treino** para salvar no histórico

## Armazenamento de dados

A aplicação salva dados no próprio navegador:

- `IndexedDB` (banco principal)
  - `treinosDB`
  - stores: `progresso`, `historico`
- `localStorage` (fallback/estado auxiliar)
  - tema (`modoTema`)
  - treino ativo
  - sessões em andamento
  - data de reset diário

## Observações

- Os dados ficam salvos localmente no dispositivo/navegador.
- Limpar dados do navegador pode apagar o histórico e progresso.
- Para usar em produção, publique os arquivos estáticos em qualquer hospedagem (ex.: GitHub Pages, Netlify, Vercel).

## Próximas melhorias (opcional)

- Exportar/importar backup do histórico (JSON)
- Sincronização em nuvem (Firebase/Supabase)
- Estatísticas semanais/mensais
