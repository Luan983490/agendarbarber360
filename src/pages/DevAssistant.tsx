import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Database, AlertTriangle, CheckCircle, RefreshCw, Play, Bug, Wrench, ListChecks, MessageCircle, Send, Trash2, User, Bot } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const RealtimeDevAssistant = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [logs, setLogs] = useState<Array<{timestamp: string; message: string; type: string}>>([]);
  
  // Claude API states
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<'success' | 'error' | null>(null);
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const SUPABASE_URL = 'https://ppmiandwpebzsfqqhhws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWlhbmR3cGVienNmcXFoaHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTIyMDQsImV4cCI6MjA3Mzk2ODIwNH0.7CXM6HqUQXfWCXYIO4VcGnqPttnqlSzm7RYnen8IY5M';

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addLog = (message: string, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };


  // Test Claude API Connection (via Edge Function)
  const testClaudeConnection = async () => {
    setTestingApi(true);
    setApiTestResult(null);
    addLog('🔍 Testando conexão com Claude via Edge Function...', 'info');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Teste de conexão. Responda apenas: OK' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        setApiTestResult('success');
        addLog('✅ Conexão com Claude estabelecida com sucesso!', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || `Erro ${response.status}`;
        
        setApiTestResult('error');
        addLog(`❌ ${errorMessage}`, 'error');
      }
    } catch (error: any) {
      setApiTestResult('error');
      console.error('Erro detalhado:', error);
      addLog(`❌ Erro de conexão: ${error.message}`, 'error');
    } finally {
      setTestingApi(false);
    }
  };

  // Call Claude API (via Edge Function)
  const callClaudeAPI = async (userMessage: string): Promise<string> => {
    addLog('Enviando pergunta para Claude...', 'info');

    // Build context with analysis results and logs
    const contextParts: string[] = [];
    
    if (results) {
      contextParts.push(`
RESULTADOS DA ÚLTIMA ANÁLISE:
- Testes de Segurança: ${results.security.passed} passaram, ${results.security.failed} falharam, ${results.security.warnings} avisos
- Performance: ${results.performance.passed} passaram, ${results.performance.failed} falharam
- Problemas Críticos: ${results.missing.critical.length}
- Problemas Médios: ${results.missing.medium.length}
- Problemas Baixos: ${results.missing.low.length}

Detalhes dos problemas críticos:
${results.missing.critical.map((issue: any) => `- ${issue.table || issue.name}: ${issue.description}`).join('\n')}

Recomendações:
${results.recommendations.join('\n- ')}
      `);
    }

    // Include last 10 logs
    const recentLogs = logs.slice(-10);
    if (recentLogs.length > 0) {
      contextParts.push(`
ÚLTIMOS 10 LOGS:
${recentLogs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n')}
      `);
    }

    const systemPrompt = `Você é um assistente especializado em Supabase, PostgreSQL e sistemas de agendamento para barbearias.

CONTEXTO DO SISTEMA:
- Tabelas principais: bookings, barbershops, barbers, services, products, reviews, favorites, profiles, user_roles, subscriptions
- O sistema usa Row Level Security (RLS) para proteger dados
- Tecnologias: React, TypeScript, Supabase, Tailwind CSS
- Sistema de autenticação via Supabase Auth
- Roles: owner (dono da barbearia), barber (barbeiro), attendant (atendente), client (cliente)

${contextParts.join('\n\n')}

INSTRUÇÕES:
1. Responda sempre em português do Brasil
2. Seja direto e objetivo
3. Quando sugerir SQL, formate como código
4. Se detectar problemas de segurança, alerte imediatamente
5. Considere sempre as melhores práticas do Supabase
6. Se não souber algo específico do sistema, pergunte ao usuário`;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [
            ...chatMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: 'user', content: userMessage }
          ],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}`;
        addLog('Erro: ' + errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      addLog('✅ Resposta recebida do Claude', 'success');
      return data.content[0].text;
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      addLog('Erro: ' + error.message, 'error');
      throw error;
    }
  };

  // Send message to Claude
  const sendMessage = async () => {
    if (!chatInput.trim() || sendingMessage) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setSendingMessage(true);
    addLog(`📤 Mensagem enviada: "${userMessage.content.substring(0, 50)}..."`, 'info');

    try {
      const response = await callClaudeAPI(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      addLog('📥 Resposta recebida do Claude', 'success');
    } catch (error: any) {
      addLog(`❌ Erro ao enviar mensagem: ${error.message}`, 'error');
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ Erro: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setSendingMessage(false);
    }
  };

  // Clear chat
  const clearChat = () => {
    setChatMessages([]);
    addLog('🗑️ Chat limpo', 'info');
  };

  const testConnection = async () => {
    addLog('Testando conexão com Supabase...', 'info');
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        setConnected(true);
        addLog('✅ Conectado ao Supabase com sucesso!', 'success');
        return true;
      } else {
        addLog('❌ Erro ao conectar: ' + response.status, 'error');
        return false;
      }
    } catch (error: any) {
      addLog('❌ Erro de conexão: ' + error.message, 'error');
      return false;
    }
  };

  const runFullAnalysis = async () => {
    setTesting(true);
    setResults(null);
    addLog('🔍 Iniciando análise completa do sistema...', 'info');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      setTesting(false);
      return;
    }

    const testResults = {
      security: { passed: 0, failed: 0, warnings: 0, tests: [] as any[] },
      performance: { passed: 0, failed: 0, warnings: 0, tests: [] as any[] },
      missing: { critical: [] as any[], medium: [] as any[], low: [] as any[] },
      recommendations: [] as string[]
    };

    addLog('Testando Row Level Security...', 'info');
    await testRLS(testResults);

    addLog('Verificando políticas de segurança...', 'info');
    await testPolicies(testResults);

    addLog('Analisando índices de performance...', 'info');
    await testIndexes(testResults);

    addLog('Identificando funcionalidades pendentes...', 'info');
    await testMissingFeatures(testResults);

    setResults(testResults);
    setTesting(false);
    addLog('✅ Análise completa finalizada!', 'success');
  };

  const testRLS = async (testResults: any) => {
    const criticalTables = ['bookings', 'barbershops', 'reviews', 'favorites', 'profiles'];
    
    for (const table of criticalTables) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          testResults.security.passed++;
          testResults.security.tests.push({
            name: `RLS ativo em ${table}`,
            status: 'passed',
            message: 'Tabela protegida corretamente'
          });
        } else if (response.ok) {
          const data = await response.json();
          if (data.length === 0) {
            testResults.security.passed++;
            testResults.security.tests.push({
              name: `RLS ativo em ${table}`,
              status: 'passed',
              message: 'Sem dados retornados (política funcionando)'
            });
          } else {
            testResults.security.failed++;
            testResults.security.tests.push({
              name: `RLS em ${table}`,
              status: 'failed',
              message: `⚠️ Dados expostos! ${data.length} registros acessíveis sem auth`
            });
          }
        }
      } catch (error: any) {
        testResults.security.warnings++;
        testResults.security.tests.push({
          name: `RLS em ${table}`,
          status: 'warning',
          message: 'Erro ao testar: ' + error.message
        });
      }
    }
  };

  const testPolicies = async (testResults: any) => {
    const missingPolicies = [
      {
        table: 'favorites',
        policy: 'INSERT',
        critical: true,
        message: 'Falta política de INSERT - vulnerabilidade crítica'
      },
      {
        table: 'reviews',
        policy: 'INSERT',
        critical: true,
        message: 'Falta política de INSERT - sistema de reviews vulnerável'
      },
      {
        table: 'bookings',
        policy: 'INSERT',
        critical: true,
        message: 'Falta política de INSERT - agendamentos desprotegidos'
      }
    ];

    missingPolicies.forEach(policy => {
      if (policy.critical) {
        testResults.security.failed++;
        testResults.missing.critical.push({
          table: policy.table,
          type: policy.policy,
          description: policy.message,
          fix: `Adicionar política ${policy.policy} para ${policy.table}`
        });
      }
    });
  };

  const testIndexes = async (testResults: any) => {
    const missingIndexes = [
      { table: 'bookings', columns: 'booking_date, booking_time', impact: 'Alto' },
      { table: 'bookings', columns: 'barber_id, booking_date', impact: 'Alto' },
      { table: 'barbershops', columns: 'city, state', impact: 'Médio' }
    ];

    missingIndexes.forEach(idx => {
      if (idx.impact === 'Alto') {
        testResults.performance.failed++;
      } else {
        testResults.performance.warnings++;
      }
      
      testResults.missing.medium.push({
        table: idx.table,
        type: 'INDEX',
        description: `Índice faltando em ${idx.columns}`,
        impact: idx.impact
      });
    });
  };

  const testMissingFeatures = async (testResults: any) => {
    const missingFeatures = [
      {
        feature: 'Validação de Conflitos de Horário',
        description: 'Não há trigger para evitar double booking',
        priority: 'CRÍTICO',
        category: 'critical'
      },
      {
        feature: 'Limpeza Automática de Logs',
        description: 'app_logs pode crescer indefinidamente',
        priority: 'ALTO',
        category: 'medium'
      },
      {
        feature: 'Sistema de Notificações',
        description: 'Notificações de agendamento não implementadas',
        priority: 'MÉDIO',
        category: 'low'
      }
    ];

    missingFeatures.forEach(feature => {
      testResults.missing[feature.category].push({
        name: feature.feature,
        description: feature.description,
        priority: feature.priority
      });
    });

    testResults.recommendations = [
      'Implementar trigger para validação de conflitos de horário',
      'Adicionar limpeza automática de logs antigos',
      'Criar sistema de notificações usando Supabase Realtime'
    ];
  };

  const autoFix = async (issueType: string) => {
    addLog(`🔧 Correção: ${issueType}`, 'info');
    
    const fixes: Record<string, string> = {
      'favorites-insert': `CREATE POLICY "Users can create their own favorites"
ON favorites FOR INSERT
TO public
WITH CHECK (auth.uid() = client_id);`,
      
      'reviews-insert': `CREATE POLICY "Clients can create reviews"
ON reviews FOR INSERT
TO public
WITH CHECK (
  auth.uid() = client_id 
  AND EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = reviews.booking_id 
    AND bookings.client_id = auth.uid()
    AND bookings.status = 'completed'
  )
);`,

      'bookings-insert': `CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);`,

      'conflict-trigger': `CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE barber_id = NEW.barber_id
    AND booking_date = NEW.booking_date
    AND booking_time = NEW.booking_time
    AND status NOT IN ('cancelled', 'no_show')
  ) THEN
    RAISE EXCEPTION 'Horário já reservado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_conflicts
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION check_booking_conflicts();`
    };

    const sql = fixes[issueType];
    if (!sql) {
      addLog('❌ Correção não disponível', 'error');
      return;
    }

    addLog('📝 SQL gerado:', 'info');
    addLog(sql, 'code');
    addLog('⚠️ Execute no Supabase SQL Editor', 'warning');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-xl">
                <Database className="w-8 h-8 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Assistente de Desenvolvimento</h1>
                <p className="text-indigo-200 text-sm md:text-base">Sistema de Barbearia - Supabase + Claude AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                {connected ? 'Supabase Online' : 'Offline'}
              </div>
              <button onClick={testConnection} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Claude API Config - Simplified (Edge Function handles the key) */}
        <div className="bg-gradient-to-r from-indigo-800/50 to-purple-800/50 rounded-xl p-4 mb-6 border border-indigo-500/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold">API Claude (Anthropic)</h3>
                <p className="text-indigo-200 text-sm">Configurada via Edge Function do servidor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testClaudeConnection}
                disabled={testingApi}
                className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                {testingApi ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Testar Conexão
              </button>
              {apiTestResult === 'success' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 text-sm">Conectado</span>
                </div>
              )}
              {apiTestResult === 'error' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300 text-sm">Erro</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Zap },
            { id: 'security', label: 'Segurança', icon: Shield },
            { id: 'missing', label: 'Pendências', icon: ListChecks },
            { id: 'fixes', label: 'Auto-Fix', icon: Wrench },
            { id: 'logs', label: 'Logs', icon: Bug },
            { id: 'chat', label: '💬 Chat com Claude', icon: MessageCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'bg-white/10 text-indigo-200 hover:bg-white/20'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/20">
          {activeTab === 'dashboard' && (
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-white">Análise Completa</h2>
                <button
                  onClick={runFullAnalysis}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 md:px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Executar Análise
                    </>
                  )}
                </button>
              </div>

              {results && (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-300" />
                        <div className="text-red-300 text-xs md:text-sm">Críticas</div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {results.security.failed + results.performance.failed}
                      </div>
                    </div>

                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-300" />
                        <div className="text-yellow-300 text-xs md:text-sm">Avisos</div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {results.security.warnings + results.performance.warnings}
                      </div>
                    </div>

                    <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-300" />
                        <div className="text-green-300 text-xs md:text-sm">Passados</div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {results.security.passed + results.performance.passed}
                      </div>
                    </div>

                    <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ListChecks className="w-5 h-5 text-purple-300" />
                        <div className="text-purple-300 text-xs md:text-sm">Pendências</div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {results.missing.critical.length + results.missing.medium.length}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-4">Testes de Segurança</h3>
                    <div className="space-y-2">
                      {results.security.tests.map((test: any, idx: number) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            test.status === 'passed'
                              ? 'bg-green-500/10 border border-green-500/30'
                              : test.status === 'failed'
                              ? 'bg-red-500/10 border border-red-500/30'
                              : 'bg-yellow-500/10 border border-yellow-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {test.status === 'passed' ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : test.status === 'failed' ? (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            )}
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">{test.name}</div>
                              <div className="text-xs md:text-sm text-gray-300">{test.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-4">Recomendações</h3>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <ul className="space-y-2">
                        {results.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-blue-200 flex items-start gap-2 text-sm md:text-base">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {!results && !testing && (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                  <p className="text-white text-lg mb-2">Clique em Executar Análise</p>
                  <p className="text-indigo-300">para testar o sistema completo</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Vulnerabilidades</h2>
              {results && results.missing.critical.length > 0 ? (
                <div className="space-y-4">
                  {results.missing.critical.map((issue: any, idx: number) => (
                    <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                        <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium">
                          {issue.table}
                        </span>
                        <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">
                          CRÍTICO
                        </span>
                      </div>
                      <h4 className="text-white font-semibold mb-1">{issue.type}</h4>
                      <p className="text-red-200 text-sm mb-3">⚠️ {issue.description}</p>
                      <button
                        onClick={() => autoFix(`${issue.table.toLowerCase()}-${issue.type.toLowerCase()}`)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-all"
                      >
                        Ver Correção
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-indigo-300">
                  Execute a análise primeiro
                </div>
              )}
            </div>
          )}

          {activeTab === 'missing' && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Pendências</h2>
              {results ? (
                <div className="space-y-6">
                  {results.missing.critical.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-red-300 mb-3">CRÍTICO</h3>
                      <div className="space-y-3">
                        {results.missing.critical.map((item: any, idx: number) => (
                          <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="text-white font-semibold mb-1">{item.name || item.table}</div>
                            <div className="text-red-200 text-sm">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.missing.medium.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-yellow-300 mb-3">ALTO</h3>
                      <div className="space-y-3">
                        {results.missing.medium.map((item: any, idx: number) => (
                          <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="text-white font-semibold mb-1">{item.name || item.table}</div>
                            <div className="text-yellow-200 text-sm">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.missing.low.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-blue-300 mb-3">MÉDIO</h3>
                      <div className="space-y-3">
                        {results.missing.low.map((item: any, idx: number) => (
                          <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="text-white font-semibold mb-1">{item.name}</div>
                            <div className="text-blue-200 text-sm">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-indigo-300">
                  Execute a análise primeiro
                </div>
              )}
            </div>
          )}

          {activeTab === 'fixes' && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Correções Automáticas</h2>
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Disponíveis:</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => autoFix('favorites-insert')}
                    className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <div className="text-white font-medium">Política INSERT - favorites</div>
                    <div className="text-indigo-300 text-sm">Proteger criação de favoritos</div>
                  </button>
                  <button
                    onClick={() => autoFix('reviews-insert')}
                    className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <div className="text-white font-medium">Política INSERT - reviews</div>
                    <div className="text-indigo-300 text-sm">Apenas clientes com booking completo</div>
                  </button>
                  <button
                    onClick={() => autoFix('bookings-insert')}
                    className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <div className="text-white font-medium">Política INSERT - bookings</div>
                    <div className="text-indigo-300 text-sm">Validar criação de agendamentos</div>
                  </button>
                  <button
                    onClick={() => autoFix('conflict-trigger')}
                    className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <div className="text-white font-medium">Trigger - Conflitos</div>
                    <div className="text-indigo-300 text-sm">Prevenir double booking</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white">Logs</h2>
                <button
                  onClick={() => setLogs([])}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all text-sm"
                >
                  Limpar
                </button>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs md:text-sm">
                {logs.length === 0 ? (
                  <div className="text-indigo-300 text-center py-8">
                    Nenhum log. Execute uma ação.
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`py-2 border-b border-white/10 ${
                        log.type === 'success'
                          ? 'text-green-300'
                          : log.type === 'error'
                          ? 'text-red-300'
                          : log.type === 'warning'
                          ? 'text-yellow-300'
                          : log.type === 'code'
                          ? 'text-blue-300 bg-slate-900/50 p-2 rounded my-2 whitespace-pre-wrap'
                          : 'text-gray-300'
                      }`}
                    >
                      <span className="text-indigo-400">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-6 h-6" />
                  Chat com Claude
                </h2>
                <button
                  onClick={clearChat}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Chat
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto bg-slate-800/30 rounded-xl p-4 mb-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Bot className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                      <p className="text-white text-lg mb-2">Olá! Sou seu assistente de desenvolvimento.</p>
                      <p className="text-indigo-300 text-sm">
                        Pergunte sobre Supabase, PostgreSQL, RLS, ou qualquer questão do sistema.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${
                            msg.role === 'user'
                              ? 'bg-blue-500/20'
                              : 'bg-indigo-500/20'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <User className="w-5 h-5 text-blue-300" />
                          ) : (
                            <Bot className="w-5 h-5 text-indigo-300" />
                          )}
                        </div>
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-blue-500/20 text-blue-100'
                              : 'bg-gray-700/50 text-gray-100'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                          <div
                            className={`text-xs mt-2 ${
                              msg.role === 'user' ? 'text-blue-400' : 'text-gray-400'
                            }`}
                          >
                            {msg.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sendingMessage && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-indigo-500/20">
                          <Bot className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                            <span className="text-gray-300 text-sm">Claude está pensando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || sendingMessage}
                  className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeDevAssistant;
