import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import logoBioOleo from './assets/logoBiooleo.png'
import './App.css'

const API_BASE = 'http://localhost:5000/api'
const AUTH_TOKEN_KEY = 'biooleoAuthToken'
const AUTH_USER_KEY = 'biooleoAuthUser'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function readStoredSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const storedUser = localStorage.getItem(AUTH_USER_KEY)

  if (!token || !storedUser) {
    return null
  }

  try {
    return { token, user: JSON.parse(storedUser) }
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

function roleHomePath(role) {
  const paths = { CLIENTE: '/cliente', MOTORISTA: '/motorista', GESTOR: '/gestor' }
  return paths[role] || '/login'
}

const roleConfig = {
  cliente: {
    title: 'Cliente',
    short: 'Área do cliente',
    description: 'Solicite coletas, acompanhe agendamentos e acompanhe o status da entrega.',
    actions: ['Nova coleta', 'Histórico', 'Contato'],
    stats: [
      { label: 'Solicitações', value: '18', detail: 'no mês' },
      { label: 'Agendadas', value: '07', detail: 'em rota' },
      { label: 'Pagamentos', value: 'R$ 3.420', detail: 'em dia' },
    ],
    listTitle: 'Coletas recentes',
    items: [
      'Residencial - Rua das Flores, 123',
      'Restaurante - Avenida Brasil, 540',
      'Hotel - Praça Central, 88',
    ],
    timeline: [
      { title: 'Coleta agendada', time: 'Hoje · 14:00' },
      { title: 'Pagamento confirmado', time: 'Ontem · 09:40' },
      { title: 'Relatório disponível', time: 'Segunda · 17:20' },
    ],
  },
  motorista: {
    title: 'Motorista',
    short: 'Área do motorista',
    description: 'Visualize rotas, confirme coletas e mantenha a logística em movimento.',
    actions: ['Rota do dia', 'Confirmar coleta', 'Relatório'],
    stats: [
      { label: 'Rotas', value: '05', detail: 'ativas' },
      { label: 'Coletas', value: '12', detail: 'concluídas' },
      { label: 'Km', value: '186', detail: 'hoje' },
    ],
    listTitle: 'Pendências de coleta',
    items: [
      'Captação em Jardim das Flores',
      'Ponto de coleta no centro',
      'Entrega ao ponto de descarte',
    ],
    timeline: [
      { title: 'Saída programada', time: 'Hoje · 08:30' },
      { title: 'Manutenção do caminhão', time: 'Hoje · 13:00' },
      { title: 'Viagem finalizada', time: 'Ontem · 18:10' },
    ],
  },
  gestor: {
    title: 'Gestor',
    short: 'Área do gestor',
    description: 'Acompanhe os indicadores, aprovações e o desempenho da operação completa.',
    actions: ['Visão geral', 'Pagamentos', 'Relatórios'],
    stats: [
      { label: 'Operações', value: '124', detail: 'executadas' },
      { label: 'Faturamento', value: 'R$ 28.600', detail: 'mês' },
      { label: 'Pendências', value: '03', detail: 'a revisar' },
    ],
    listTitle: 'Ações prioritárias',
    items: [
      'Aprovar pagamento de 02 rotas',
      'Revisar indicadores de logística',
      'Atualizar desempenho semanal',
    ],
    timeline: [
      { title: 'Reunião de operação', time: 'Hoje · 10:00' },
      { title: 'Reembolso pendente', time: 'Hoje · 15:30' },
      { title: 'Meta mensal revisada', time: 'Ontem · 16:00' },
    ],
  },
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const [session, setSession] = useState(readStoredSession)

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem('biooleoToken')
    localStorage.removeItem('biooleoToken_motorista')
    localStorage.removeItem('biooleoToken_gestor')
    setSession(null)
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to={session ? roleHomePath(session.user.role) : '/login'} replace />} />
        <Route
          path="/login"
          element={session
            ? <Navigate to={roleHomePath(session.user.role)} replace />
            : <AuthPage key="public-auth" onAuthenticated={setSession} />}
        />
        <Route
          path="/painel-interno-biooleo"
          element={session
            ? <Navigate to={roleHomePath(session.user.role)} replace />
            : <AuthPage key="manager-auth" managerPortal onAuthenticated={setSession} />}
        />
        <Route
          path="/cliente"
          element={(
            <RequireRole session={session} role="CLIENTE">
              <RolePage role="cliente" session={session} onLogout={logout} />
            </RequireRole>
          )}
        />
        <Route
          path="/motorista"
          element={(
            <RequireRole session={session} role="MOTORISTA">
              <RolePage role="motorista" session={session} onLogout={logout} />
            </RequireRole>
          )}
        />
        <Route
          path="/gestor"
          element={(
            <RequireRole session={session} role="GESTOR">
              <RolePage role="gestor" session={session} onLogout={logout} />
            </RequireRole>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function RequireRole({ session, role, children }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (session.user.role !== role) {
    return <Navigate to={roleHomePath(session.user.role)} replace />
  }

  return children
}

function AuthPage({ managerPortal = false, onAuthenticated }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [signupRole, setSignupRole] = useState('CLIENTE')
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: managerPortal ? '333.444.555-66' : '',
    endereco: '',
    senha: managerPortal ? '123456' : '',
    confirmarSenha: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (mode === 'signup' && formData.senha !== formData.confirmarSenha) {
      setError('As senhas informadas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const isSignup = mode === 'signup'
      const endpoint = isSignup ? 'signup' : 'login'
      const body = isSignup
        ? {
            nome: formData.nome.trim(),
            email: formData.email.trim(),
            cpf: formData.cpf.trim(),
            endereco: formData.endereco.trim(),
            senha: formData.senha,
            role: signupRole,
          }
        : { cpf: formData.cpf.trim(), senha: formData.senha }

      const response = await fetch(`${API_BASE}/usuarios/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível autenticar. Verifique os dados e tente novamente.')
      }

      const user = data.usuario
      if (!user?.role || !data.token) {
        throw new Error('A resposta do servidor não contém os dados de sessão esperados.')
      }

      const userRole = user.role.toUpperCase()
      if (managerPortal && userRole !== 'GESTOR') {
        throw new Error('Este acesso é exclusivo para a conta de gestor.')
      }

      if (!managerPortal && !['CLIENTE', 'MOTORISTA'].includes(userRole)) {
        throw new Error('O perfil gestor deve entrar pelo portal administrativo reservado.')
      }

      if (isSignup && userRole !== signupRole) {
        throw new Error('O perfil retornado não corresponde ao tipo de cadastro selecionado.')
      }

      const authenticatedSession = { token: data.token, user }
      localStorage.setItem(AUTH_TOKEN_KEY, data.token)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
      localStorage.removeItem('biooleoToken')
      localStorage.removeItem('biooleoToken_motorista')
      localStorage.removeItem('biooleoToken_gestor')
      onAuthenticated(authenticatedSession)
      navigate(roleHomePath(userRole), { replace: true })
    } catch (authError) {
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <header className="auth-brand">
        <img src={logoBioOleo} alt="Logo BioÓleo Brasil" className="brand-logo" />
        {!managerPortal ? (
          <Link className="auth-manager-link auth-manager-link--header" to="/painel-interno-biooleo">
            Acesso do gestor <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </header>

      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Gestão sustentável, simples e segura</p>
          <h1>{managerPortal ? 'Acesso administrativo' : 'Bem-vindo à BioÓleo Brasil'}</h1>
          <p>
            {managerPortal
              ? 'Entre com a conta administrativa autorizada para acompanhar toda a operação.'
              : 'Acesse sua conta ou crie seu cadastro para solicitar e acompanhar coletas de óleo.'}
          </p>
        </section>

        <section className="auth-card" aria-label={managerPortal ? 'Login do gestor' : 'Login e cadastro'}>
          {!managerPortal ? (
            <div className="auth-mode-switch" role="tablist" aria-label="Tipo de acesso">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'selected' : ''}
                onClick={() => { setMode('login'); setError('') }}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'selected' : ''}
                onClick={() => { setMode('signup'); setError('') }}
              >
                Criar cadastro
              </button>
            </div>
          ) : null}

          <div className="auth-card__heading">
            <span className="badge">{managerPortal ? 'Área restrita' : mode === 'login' ? 'Acesso à conta' : 'Novo cadastro'}</span>
            <h2>{managerPortal ? 'Entrar como gestor' : mode === 'login' ? 'Fazer login' : 'Crie sua conta'}</h2>
            <p>
              {managerPortal
                ? 'Use as credenciais administrativas fornecidas pela organização.'
                : mode === 'login'
                  ? 'Entre com seu CPF e senha cadastrados.'
                  : 'Escolha o perfil e informe seus dados para começar.'}
            </p>
          </div>

          {mode === 'signup' && !managerPortal ? (
            <div className="signup-role-picker" aria-label="Escolha o perfil do cadastro">
              <button
                type="button"
                className={signupRole === 'CLIENTE' ? 'selected' : ''}
                onClick={() => setSignupRole('CLIENTE')}
              >
                <strong>Cliente</strong>
                <span>Solicitar e acompanhar coletas</span>
              </button>
              <button
                type="button"
                className={signupRole === 'MOTORISTA' ? 'selected' : ''}
                onClick={() => setSignupRole('MOTORISTA')}
              >
                <strong>Motorista</strong>
                <span>Visualizar e concluir coletas</span>
              </button>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && !managerPortal ? (
              <>
                <label>
                  Nome completo
                  <input
                    type="text"
                    autoComplete="name"
                    value={formData.nome}
                    onChange={(event) => setFormData({ ...formData, nome: event.target.value })}
                    required
                  />
                </label>
                <label>
                  CPF
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength="14"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(event) => setFormData({ ...formData, cpf: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Endereço
                  <input
                    type="text"
                    autoComplete="street-address"
                    value={formData.endereco}
                    onChange={(event) => setFormData({ ...formData, endereco: event.target.value })}
                    required
                  />
                </label>
              </>
            ) : null}

            {mode === 'signup' && !managerPortal ? (
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  required
                />
              </label>
            ) : (
              <label>
                CPF
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength="14"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(event) => setFormData({ ...formData, cpf: event.target.value })}
                  required
                />
              </label>
            )}
            <label>
              Senha
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength="6"
                value={formData.senha}
                onChange={(event) => setFormData({ ...formData, senha: event.target.value })}
                required
              />
            </label>
            {mode === 'signup' && !managerPortal ? (
              <label>
                Confirmar senha
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength="6"
                  value={formData.confirmarSenha}
                  onChange={(event) => setFormData({ ...formData, confirmarSenha: event.target.value })}
                  required
                />
              </label>
            ) : null}

            {error ? <p className="feedback error" role="alert">{error}</p> : null}
            <button type="submit" className="primary-button auth-submit" disabled={loading}>
              {loading ? 'Aguarde...' : managerPortal ? 'Acessar painel' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {managerPortal ? (
            <aside className="manager-demo-credentials" aria-label="Credenciais de demonstração">
              <strong>Login sugerido para o protótipo</strong>
              <span><b>CPF:</b> 333.444.555-66</span>
              <span><b>Senha:</b> 123456</span>
            </aside>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function RolePage({ role, session, onLogout }) {
  const config = roleConfig[role]
  const [formData, setFormData] = useState({ quantidadeGarrafas: '10', enderecoColeta: 'Rua da Sustentabilidade, 150' })
  const [coletas, setColetas] = useState([])
  const [historicoColetas, setHistoricoColetas] = useState([])
  const [loading, setLoading] = useState(false)
  const [isLoadingColetas, setIsLoadingColetas] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isClient = role === 'cliente'
  const isDriver = role === 'motorista'
  const isManager = role === 'gestor'

  useEffect(() => {
    if (!isClient && !isDriver && !isManager) {
      return
    }

    const loadColetas = async () => {
      setIsLoadingColetas(true)

      try {
        if (isClient) {
          let response = await fetch(`${API_BASE}/coletas/minhas-coletas`, {
            method: 'GET',
            headers: getAuthHeaders(),
          })

          if (!response.ok && response.status === 404) {
            response = await fetch(`${API_BASE}/minhas-coletas`, {
              method: 'GET',
              headers: getAuthHeaders(),
            })
          }

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao buscar coletas do cliente.')
          }

          setColetas(Array.isArray(data) ? data : [])
          return
        }

        if (isManager) {
          const response = await fetch(`${API_BASE}/coletas`, {
            method: 'GET',
            headers: getAuthHeaders(),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao buscar todas as coletas.')
          }

          setColetas(Array.isArray(data) ? data : [])
          return
        }

        const response = await fetch(`${API_BASE}/coletas/pendentes`, {
          method: 'GET',
          headers: getAuthHeaders(),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao buscar coletas pendentes.')
        }

        setColetas(Array.isArray(data) ? data : [])

        const historyResponse = await fetch(`${API_BASE}/coletas/historico`, {
          method: 'GET',
          headers: getAuthHeaders(),
        })
        const historyData = await historyResponse.json()

        if (!historyResponse.ok) {
          throw new Error(historyData.error || 'Erro ao buscar histórico de coletas.')
        }

        setHistoricoColetas(Array.isArray(historyData) ? historyData : [])
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setIsLoadingColetas(false)
      }
    }

    loadColetas()
  }, [isClient, isDriver, isManager])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isClient) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE}/coletas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          quantidadeGarrafas: Number(formData.quantidadeGarrafas),
          enderecoColeta: formData.enderecoColeta,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao solicitar coleta.')
      }

      setSuccess('Coleta solicitada com sucesso!')
      setFormData({
        quantidadeGarrafas: '10',
        enderecoColeta: 'Rua da Sustentabilidade, 150',
      })

      const refresh = await fetch(`${API_BASE}/coletas/minhas-coletas`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (refresh.ok) {
        const refreshed = await refresh.json()
        setColetas(Array.isArray(refreshed) ? refreshed : [])
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCollection = async (coletaId) => {
    if (!coletaId) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE}/coletas/${coletaId}/coletar`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ motoristaId: session.user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao confirmar coleta.')
      }

      const completedCollection = coletas.find((item) => item.id === coletaId)
      setSuccess('Coleta confirmada com sucesso!')
      setColetas((current) => current.filter((item) => item.id !== coletaId))
      setHistoricoColetas((current) => [
        { ...completedCollection, ...data },
        ...current.filter((item) => item.id !== coletaId),
      ])
    } catch (confirmError) {
      setError(confirmError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async (coletaId) => {
    if (!coletaId) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE}/coletas/${coletaId}/pagar`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao confirmar pagamento.')
      }

      setColetas((current) =>
        current.map((item) => (item.id === coletaId ? { ...item, ...data, status: 'PAGO' } : item)),
      )
      setSuccess(`Pagamento da coleta ${data.codigoPET || ''} confirmado com sucesso.`.trim())
    } catch (paymentError) {
      setError(paymentError.message)
    } finally {
      setLoading(false)
    }
  }

  const clientSummary = useMemo(() => {
    if (!isClient) {
      return null
    }

    return {
      total: coletas.length,
      pendentes: coletas.filter((item) => item.status === 'PENDENTE').length,
      coletadas: coletas.filter((item) => item.status === 'COLETADO').length,
    }
  }, [coletas, isClient])

  const managerSummary = useMemo(() => ({
    total: coletas.length,
    pendentes: coletas.filter((item) => item.status === 'PENDENTE').length,
    aguardandoPagamento: coletas.filter((item) => item.status === 'COLETADO').length,
    pagas: coletas.filter((item) => item.status === 'PAGO').length,
  }), [coletas])

  return (
    <div className="page role-page">
      <header className="topbar role-header">
        <div className="brand-block">
          <img src={logoBioOleo} alt="Logo BioÓleo Brasil" className="brand-logo" />
        </div>

        <div className="account-toolbar">
          <span>{session.user.nome}</span>
          <button type="button" className="logout-button" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="dashboard-shell">
        <section className="hero-panel">
          <div>
            <span className="badge">{config.short}</span>
            <h2>{config.title}</h2>
            <p>{config.description}</p>
          </div>

          <div className="action-row">
            {config.actions.map((action) => (
              <button type="button" key={action} className="primary-button">
                {action}
              </button>
            ))}
          </div>
        </section>

        {isClient ? (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <span>Total</span>
                <strong>{clientSummary?.total ?? 0}</strong>
                <small>solicitações</small>
              </article>
              <article className="stat-card">
                <span>Pendentes</span>
                <strong>{clientSummary?.pendentes ?? 0}</strong>
                <small>em análise</small>
              </article>
              <article className="stat-card">
                <span>Coletadas</span>
                <strong>{clientSummary?.coletadas ?? 0}</strong>
                <small>concluídas</small>
              </article>
            </section>

            <section className="content-grid client-grid">
              <article className="info-panel form-panel">
                <h3>Solicitar coleta</h3>

                <form onSubmit={handleSubmit} className="collection-form">
                  <label>
                    Quantidade de garrafas
                    <input
                      type="number"
                      min="1"
                      value={formData.quantidadeGarrafas}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          quantidadeGarrafas: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Endereço da coleta
                    <input
                      type="text"
                      value={formData.enderecoColeta}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          enderecoColeta: event.target.value,
                        }))
                      }
                    />
                  </label>

                  {error ? <p className="feedback error">{error}</p> : null}
                  {success ? <p className="feedback success">{success}</p> : null}

                  <button type="submit" className="primary-button submit-button" disabled={loading}>
                    {loading ? 'Solicitando...' : 'Solicitar coleta'}
                  </button>
                </form>
              </article>

              <article className="info-panel">
                <h3>Histórico pessoal</h3>
                <div className="history-list">
                  {coletas.length === 0 ? (
                    <p className="empty-state">Nenhuma coleta registrada ainda.</p>
                  ) : (
                    coletas.map((coleta) => (
                      <div key={coleta.id || coleta.codigoPET} className="history-card">
                        <div className="history-head">
                          <strong>{coleta.codigoPET || 'PET'}</strong>
                          <span className={`status-badge ${String(coleta.status || 'PENDENTE').toLowerCase()}`}>
                            {coleta.status || 'PENDENTE'}
                          </span>
                        </div>
                        <p>{coleta.enderecoColeta || coleta.endereco || 'Endereço não informado'}</p>
                        <small>{coleta.quantidadeGarrafas || 0} garrafa(s)</small>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          </>
        ) : null}

        {isDriver ? (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <span>Coletas</span>
                <strong>{coletas.length}</strong>
                <small>pendentes hoje</small>
              </article>
              <article className="stat-card">
                <span>Rota</span>
                <strong>05</strong>
                <small>em andamento</small>
              </article>
              <article className="stat-card">
                <span>Km</span>
                <strong>186</strong>
                <small>hoje</small>
              </article>
            </section>

            <section className="content-grid driver-grid">
              <article className="info-panel driver-panel">
                <h3>Coletas pendentes</h3>

                {error ? <p className="feedback error">{error}</p> : null}
                {success ? <p className="feedback success">{success}</p> : null}

                <div className="driver-list">
                  {coletas.length === 0 ? (
                    <p className="empty-state">Nenhuma coleta pendente no momento.</p>
                  ) : (
                    coletas.map((coleta) => (
                      <div key={coleta.id || coleta.codigoPET} className="driver-card">
                        <div className="driver-card__header">
                          <div>
                            <strong>{coleta.codigoPET || 'PET'}</strong>
                            <p>{coleta.cliente?.nome || 'Cliente'}</p>
                          </div>
                          <span className="status-badge pendente">Pendente</span>
                        </div>

                        <div className="driver-card__meta">
                          <span>{coleta.quantidadeGarrafas || 0} garrafa(s)</span>
                          <span>{coleta.cliente?.endereco || coleta.enderecoColeta || 'Endereço não informado'}</span>
                        </div>

                        <button
                          type="button"
                          className="primary-button driver-action"
                          onClick={() => handleConfirmCollection(coleta.id)}
                          disabled={loading}
                        >
                          {loading ? 'Confirmando...' : 'Confirmar/Concluir Coleta'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="info-panel driver-history-panel">
                <div className="driver-history-heading">
                  <div>
                    <h3>Histórico de entregas feitas</h3>
                    <p>Coletas concluídas por você.</p>
                  </div>
                  <span className="manager-count">{historicoColetas.length} concluída(s)</span>
                </div>

                {isLoadingColetas ? (
                  <p className="empty-state">Carregando histórico...</p>
                ) : historicoColetas.length === 0 ? (
                  <p className="empty-state">Você ainda não concluiu nenhuma coleta.</p>
                ) : (
                  <div className="driver-history-list">
                    {historicoColetas.map((coleta) => (
                      <article key={coleta.id || coleta.codigoPET} className="driver-history-card">
                        <div className="driver-history-card__top">
                          <div>
                            <strong>{coleta.codigoPET || 'Coleta'}</strong>
                            <span>{coleta.cliente?.nome || 'Cliente'}</span>
                          </div>
                          <span className={`status-badge ${String(coleta.status || 'COLETADO').toLowerCase()}`}>
                            {coleta.status === 'PAGO' ? 'Paga' : 'Concluída'}
                          </span>
                        </div>
                        <p>{coleta.enderecoColeta || 'Endereço não informado'}</p>
                        <div className="driver-history-card__meta">
                          <span>{coleta.quantidadeGarrafas ?? 0} garrafa(s)</span>
                          <span>
                            {coleta.dataColeta
                              ? new Intl.DateTimeFormat('pt-BR', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }).format(new Date(coleta.dataColeta))
                              : 'Data não informada'}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </>
        ) : null}

        {isManager ? (
          <>
            <section className="stats-grid manager-stats">
              <article className="stat-card">
                <span>Todas as coletas</span>
                <strong>{managerSummary.total}</strong>
                <small>registros no sistema</small>
              </article>
              <article className="stat-card">
                <span>Pendentes</span>
                <strong>{managerSummary.pendentes}</strong>
                <small>aguardando coleta</small>
              </article>
              <article className="stat-card">
                <span>Aguardando pagamento</span>
                <strong>{managerSummary.aguardandoPagamento}</strong>
                <small>coletas concluídas</small>
              </article>
              <article className="stat-card">
                <span>Pagas</span>
                <strong>{managerSummary.pagas}</strong>
                <small>pagamentos confirmados</small>
              </article>
            </section>

            <section className="info-panel manager-panel">
              <div className="manager-panel__heading">
                <div>
                  <h3>Controle de coletas e pagamentos</h3>
                  <p>Consulte todos os registros e confirme o pagamento após a conclusão da coleta.</p>
                </div>
                <span className="manager-count">{coletas.length} registro(s)</span>
              </div>

              {error ? <p className="feedback error" role="alert">{error}</p> : null}
              {success ? <p className="feedback success" role="status">{success}</p> : null}

              {isLoadingColetas ? (
                <p className="empty-state manager-state">Carregando coletas do sistema...</p>
              ) : coletas.length === 0 ? (
                <p className="empty-state manager-state">Nenhuma coleta encontrada no sistema.</p>
              ) : (
                <div className="manager-table-wrap">
                  <table className="manager-table">
                    <thead>
                      <tr>
                        <th>Coleta</th>
                        <th>Cliente</th>
                        <th>Endereço</th>
                        <th>Quantidade</th>
                        <th>Motorista</th>
                        <th>Solicitada em</th>
                        <th>Status</th>
                        <th>Pagamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coletas.map((coleta) => (
                        <tr key={coleta.id || coleta.codigoPET}>
                          <td data-label="Coleta">
                            <strong>{coleta.codigoPET || '—'}</strong>
                          </td>
                          <td data-label="Cliente">{coleta.cliente?.nome || '—'}</td>
                          <td data-label="Endereço">{coleta.enderecoColeta || '—'}</td>
                          <td data-label="Quantidade">{coleta.quantidadeGarrafas ?? 0} garrafa(s)</td>
                          <td data-label="Motorista">{coleta.motorista?.nome || '—'}</td>
                          <td data-label="Solicitada em">
                            {coleta.dataSolicitacao
                              ? new Intl.DateTimeFormat('pt-BR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                }).format(new Date(coleta.dataSolicitacao))
                              : '—'}
                          </td>
                          <td data-label="Status">
                            <span className={`status-badge ${String(coleta.status || '').toLowerCase()}`}>
                              {coleta.status || '—'}
                            </span>
                          </td>
                          <td data-label="Pagamento">
                            {coleta.status === 'COLETADO' ? (
                              <button
                                type="button"
                                className="primary-button manager-payment-button"
                                onClick={() => handleConfirmPayment(coleta.id)}
                                disabled={loading}
                              >
                                {loading ? 'Confirmando...' : 'Confirmar Pagamento'}
                              </button>
                            ) : coleta.status === 'PAGO' ? (
                              <span className="manager-paid-label">
                                Pago{coleta.dataPagamento
                                  ? ` · ${new Intl.DateTimeFormat('pt-BR').format(new Date(coleta.dataPagamento))}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="manager-action-note">Após a coleta</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}

      </main>
    </div>
  )
}

export default App
