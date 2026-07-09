# treinosOnline

Aplicação web de cronograma de treinos com autenticação de usuário, controle de exercícios, séries, cronômetro, histórico e círculos sociais para comparação de frequência entre amigos.

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6 |
| **Backend** | Node.js, Express, Mongoose |
| **Banco de dados** | MongoDB |
| **Auth** | JWT + bcrypt |
| **Infra** | Docker + Docker Compose |

## Funcionalidades

### Treinos
- Dois planos de treino: **Ollie** (A) e **Bibia** (B), com dias da semana e exercícios configurados
- Início e finalização de treino com **cronômetro em tempo real**
- Controle de exercícios por dia: **checkbox** (feito/não feito) + **número de séries**
- **Reset automático diário** dos checks e séries
- **Histórico de treinos** por plano (data, exercícios feitos/total, duração)
- Dados sincronizados com a API por usuário logado

### Círculos
- Crie um grupo com seus amigos usando um **código de convite** único
- **Ranking** de frequência com medalhas (🥇🥈🥉) por semana, mês ou total
- **Feed** de treinos recentes de todos os membros do círculo
- Contador em destaque: quantas vezes você foi à academia no período

### Geral
- **Autenticação** com cadastro e login — senhas com bcrypt, sessão via JWT
- **Modo claro/escuro** com persistência
- Design responsivo para mobile e desktop

## Estrutura do projeto

```
cronograma-treinos/
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── assets/         # logo.png
│   │   ├── context/        # AuthContext, ThemeContext
│   │   ├── components/     # Layout, PrivateRoute
│   │   ├── pages/          # Login, Register, Treinos, Circulo
│   │   └── services/       # api.js (axios)
│   ├── public/             # favicon (logo.png)
│   ├── nginx.conf
│   └── Dockerfile
├── backend/                # Node.js + Express
│   ├── src/
│   │   ├── models/         # User, WorkoutPlan, WorkoutSession, Circle
│   │   ├── routes/         # auth, workouts, sessions, circles
│   │   └── middleware/     # authMiddleware (JWT)
│   ├── .env.example
│   └── Dockerfile
└── docker-compose.yml      # 3 serviços: frontend, backend, mongodb
```

## Como rodar

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) instalado

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd cronograma-treinos
```

### 2. Configurar o contexto do Docker (uma vez só)
```bash
docker context use default
```

### 3. Subir os serviços
```bash
docker compose up -d
```

### 4. Acessar
| Serviço | URL |
|---|---|
| **Aplicação** | http://localhost:8181 |
| **API health** | http://localhost:8181/api/health |

### Parar os serviços
```bash
docker compose down
```

### Ver logs
```bash
docker compose logs -f
```

## Variáveis de ambiente

Copie o arquivo de exemplo e ajuste os valores em produção:

```bash
cp backend/.env.example backend/.env
```

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do backend | `5000` |
| `MONGODB_URI` | URI de conexão MongoDB | `mongodb://mongodb:27017/cronograma-treinos` |
| `JWT_SECRET` | Chave secreta do JWT — **troque em produção** | `dev_secret_troque_em_producao` |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |

## Autenticação e segurança

- Cadastro via `/register` — senha armazenada com **bcrypt (12 rounds)**
- Login via `/login` — retorna **JWT assinado com HS256**
- Token com expiração de 7 dias — qualquer alteração no payload invalida o token
- Rotas protegidas validam o token via header `Authorization: Bearer <token>`

## API — rotas principais

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Cadastro de usuário |
| `POST` | `/api/auth/login` | Login, retorna JWT |
| `GET` | `/api/workouts` | Plano de treino do usuário |
| `PUT` | `/api/workouts` | Atualizar plano de treino |
| `POST` | `/api/sessions` | Registrar treino finalizado |
| `GET` | `/api/sessions` | Listar histórico de treinos |
| `GET` | `/api/sessions/stats` | Contagem por período (week/month) |
| `GET` | `/api/circles/me` | Meu círculo |
| `POST` | `/api/circles` | Criar círculo |
| `POST` | `/api/circles/join` | Entrar por código de convite |
| `POST` | `/api/circles/leave` | Sair do círculo |
| `GET` | `/api/circles/:id/stats` | Ranking e feed do círculo |

## Próximas melhorias

- Edição dos exercícios do plano de treino pela interface
- Notificações de treino
- Exportar histórico em JSON
- Estatísticas avançadas (volume, evolução de séries)
