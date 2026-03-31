# treinosOnline

Aplicação web de cronograma de treinos com autenticação de usuário, controle de exercícios, séries, histórico e cronômetro por treino.

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6 |
| **Backend** | Node.js, Express, Mongoose |
| **Banco de dados** | MongoDB |
| **Auth** | JWT + bcrypt |
| **Infra** | Docker + Docker Compose |

## Estrutura do projeto

```
cronograma-treinos/
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/          # Login.jsx, Register.jsx
│   │   ├── components/     # PrivateRoute.jsx
│   │   └── services/       # api.js (axios)
│   ├── nginx.conf
│   └── Dockerfile
├── backend/                # Node.js + Express
│   ├── src/
│   │   ├── models/         # User.js (Mongoose)
│   │   ├── routes/         # auth.js
│   │   └── middleware/     # authMiddleware.js (JWT)
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

## Autenticação

- Cadastro via `/register` — senha armazenada com **bcrypt (12 rounds)**
- Login via `/login` — retorna **JWT com expiração de 7 dias**
- Rotas protegidas validam o token via header `Authorization: Bearer <token>`

## Próximas melhorias

- Telas de treino (exercícios, séries, cronômetro)
- Histórico de treinos por usuário
- Estatísticas semanais/mensais
- Exportar histórico em JSON
