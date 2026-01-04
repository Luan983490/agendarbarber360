import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// ============================================
// MOCKS DO SUPABASE
// ============================================

// Estado do mock para controlar comportamento
let mockSession: any = null;
let mockUser: any = null;
let authStateCallback: ((event: string, session: any) => void) | null = null;

// Mock do toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock completo do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ 
        data: { session: mockSession }, 
        error: null 
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(() => {
        mockSession = null;
        mockUser = null;
        // Disparar evento de logout
        if (authStateCallback) {
          authStateCallback('SIGNED_OUT', null);
        }
        return Promise.resolve({ error: null });
      }),
      onAuthStateChange: vi.fn((callback) => {
        authStateCallback = callback;
        // Disparar evento inicial
        setTimeout(() => callback('INITIAL_SESSION', mockSession), 0);
        return {
          data: { 
            subscription: { 
              unsubscribe: vi.fn() 
            } 
          }
        };
      }),
      refreshSession: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));

// Importar após os mocks
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// HELPERS E FACTORIES
// ============================================

const createMockUser = (overrides = {}) => ({
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { user_type: 'client' },
  ...overrides
});

const createMockSession = (user = createMockUser()) => ({
  access_token: 'mock-access-token-xyz',
  refresh_token: 'mock-refresh-token-abc',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// ============================================
// TESTES
// ============================================

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockUser = null;
    authStateCallback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // ESTADO INICIAL
  // ==========================================
  describe('Estado Inicial', () => {
    it('deve iniciar com loading true e user/session null', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      // Inicialmente loading pode ser true
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('deve definir loading como false após carregar sessão', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('deve chamar getSession na inicialização', async () => {
      renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(supabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('deve configurar listener de auth state change', async () => {
      renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // PERSISTÊNCIA DE SESSÃO
  // ==========================================
  describe('Persistência de Sessão', () => {
    it('deve restaurar sessão existente do storage', async () => {
      const existingUser = createMockUser({ email: 'existing@test.com' });
      const existingSession = createMockSession(existingUser);
      mockSession = existingSession;
      mockUser = existingUser;

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: existingSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.session).toBeTruthy();
        expect(result.current.user?.email).toBe('existing@test.com');
      });
    });

    it('deve manter user e session sincronizados', async () => {
      const user = createMockUser();
      const session = createMockSession(user);
      mockSession = session;

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.session?.user?.id).toBe(result.current.user?.id);
      });
    });
  });

  // ==========================================
  // LOGIN COM CREDENCIAIS VÁLIDAS
  // ==========================================
  describe('Login com Credenciais Válidas', () => {
    it('deve fazer login com sucesso', async () => {
      const user = createMockUser({ email: 'valid@test.com' });
      const session = createMockSession(user);

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user, session },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('valid@test.com', 'password123');

      expect(response.error).toBeNull();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'valid@test.com',
        password: 'password123'
      });
    });

    it('deve verificar subscription para barbershop_owner', async () => {
      const user = createMockUser({ 
        id: 'owner-123',
        email: 'owner@barbershop.com' 
      });
      const session = createMockSession(user);

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user, session },
        error: null
      });

      // Mock para profile como barbershop_owner
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { user_type: 'barbershop_owner' }, 
              error: null 
            })
          } as any;
        }
        if (table === 'barbershops') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'barbershop-123' }, 
              error: null 
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      });

      // Mock subscription ativa
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ is_active: true, days_remaining: 5, plan_type: 'trial' }],
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('owner@barbershop.com', 'password123');

      expect(response.error).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('check_subscription_status', {
        barbershop_uuid: 'barbershop-123'
      });
    });

    it('deve bloquear login se subscription expirada', async () => {
      const user = createMockUser({ 
        id: 'owner-expired',
        email: 'expired@barbershop.com' 
      });
      const session = createMockSession(user);

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user, session },
        error: null
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { user_type: 'barbershop_owner' }, 
              error: null 
            })
          } as any;
        }
        if (table === 'barbershops') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'barbershop-expired' }, 
              error: null 
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      });

      // Mock subscription EXPIRADA
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ is_active: false, days_remaining: 0, plan_type: 'trial' }],
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('expired@barbershop.com', 'password123');

      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe('Subscription expired');
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Teste gratuito encerrado',
          variant: 'destructive'
        })
      );
    });
  });

  // ==========================================
  // LOGIN COM CREDENCIAIS INVÁLIDAS
  // ==========================================
  describe('Login com Credenciais Inválidas', () => {
    it('deve retornar erro para credenciais inválidas', async () => {
      const authError = { 
        message: 'Invalid login credentials',
        status: 400
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: authError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('wrong@test.com', 'wrongpass');

      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe('Invalid login credentials');
    });

    it('deve exibir toast de erro para login inválido', async () => {
      const authError = { message: 'Invalid login credentials' };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: authError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signIn('wrong@test.com', 'wrongpass');

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro no login',
          description: 'Invalid login credentials',
          variant: 'destructive'
        })
      );
    });

    it('deve retornar erro para email não confirmado', async () => {
      const authError = { message: 'Email not confirmed' };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: authError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('unconfirmed@test.com', 'password');

      expect(response.error?.message).toBe('Email not confirmed');
    });

    it('deve retornar erro para muitas tentativas', async () => {
      const authError = { message: 'Too many requests' };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: authError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('test@test.com', 'password');

      expect(response.error?.message).toBe('Too many requests');
    });
  });

  // ==========================================
  // SIGNUP
  // ==========================================
  describe('Sign Up', () => {
    it('deve fazer signup com sucesso como client', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { 
          user: createMockUser({ email: 'new@client.com' }), 
          session: null 
        },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('new@client.com', 'password123', 'client');

      expect(response.error).toBeNull();
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@client.com',
        password: 'password123',
        options: {
          emailRedirectTo: expect.stringContaining('/'),
          data: { user_type: 'client' }
        }
      });
    });

    it('deve fazer signup com sucesso como barbershop_owner', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { 
          user: createMockUser({ 
            email: 'owner@new.com',
            user_metadata: { user_type: 'barbershop_owner' }
          }), 
          session: null 
        },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('owner@new.com', 'password123', 'barbershop_owner');

      expect(response.error).toBeNull();
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: { user_type: 'barbershop_owner' }
          })
        })
      );
    });

    it('deve exibir toast de sucesso após signup', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: createMockUser(), session: null },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signUp('new@test.com', 'password123', 'client');

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cadastro realizado!',
          description: 'Verifique seu email para confirmar a conta.'
        })
      );
    });

    it('deve retornar erro para email já cadastrado', async () => {
      const signupError = { message: 'User already registered' };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: signupError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('existing@test.com', 'password', 'client');

      expect(response.error).toBeDefined();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro no cadastro',
          variant: 'destructive'
        })
      );
    });

    it('deve incluir emailRedirectTo com origin correto', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: createMockUser(), session: null },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signUp('test@test.com', 'password', 'client');

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: expect.stringMatching(/^https?:\/\//)
          })
        })
      );
    });
  });

  // ==========================================
  // LOGOUT
  // ==========================================
  describe('Logout', () => {
    it('deve fazer logout com sucesso', async () => {
      // Simular usuário logado
      const user = createMockUser();
      const session = createMockSession(user);
      mockSession = session;
      mockUser = user;

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.session).toBeTruthy();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('deve exibir toast de sucesso após logout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signOut();

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Logout realizado',
          description: 'Você foi desconectado com sucesso.'
        })
      );
    });

    it('deve limpar user e session após logout', async () => {
      const user = createMockUser();
      const session = createMockSession(user);

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
        // Simular callback de SIGNED_OUT
        if (authStateCallback) {
          authStateCallback('SIGNED_OUT', null);
        }
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });
  });

  // ==========================================
  // AUTH STATE CHANGE EVENTS
  // ==========================================
  describe('Auth State Change Events', () => {
    it('deve atualizar state quando recebe SIGNED_IN', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newUser = createMockUser({ email: 'signed-in@test.com' });
      const newSession = createMockSession(newUser);

      // Simular evento SIGNED_IN
      await act(async () => {
        if (authStateCallback) {
          authStateCallback('SIGNED_IN', newSession);
        }
      });

      await waitFor(() => {
        expect(result.current.user?.email).toBe('signed-in@test.com');
        expect(result.current.session).toBeTruthy();
      });
    });

    it('deve atualizar state quando recebe TOKEN_REFRESHED', async () => {
      const user = createMockUser();
      const initialSession = createMockSession(user);

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: initialSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.session).toBeTruthy();
      });

      // Simular refresh de token
      const refreshedSession = {
        ...initialSession,
        access_token: 'new-refreshed-token',
        expires_at: Math.floor(Date.now() / 1000) + 7200
      };

      await act(async () => {
        if (authStateCallback) {
          authStateCallback('TOKEN_REFRESHED', refreshedSession);
        }
      });

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('new-refreshed-token');
      });
    });

    it('deve limpar state quando recebe SIGNED_OUT', async () => {
      const user = createMockUser();
      const session = createMockSession(user);

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Simular evento SIGNED_OUT
      await act(async () => {
        if (authStateCallback) {
          authStateCallback('SIGNED_OUT', null);
        }
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });
  });

  // ==========================================
  // TRATAMENTO DE ERROS
  // ==========================================
  describe('Tratamento de Erros', () => {
    it('deve lidar com erro de rede no login', async () => {
      const networkError = { message: 'Network request failed' };

      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.signIn('test@test.com', 'password')
      ).rejects.toThrow();
    });

    it('deve lidar com erro de rede no signup', async () => {
      const networkError = { message: 'Network request failed' };

      vi.mocked(supabase.auth.signUp).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.signUp('test@test.com', 'password', 'client')
      ).rejects.toThrow();
    });

    it('deve lidar com senha muito fraca', async () => {
      const weakPasswordError = { 
        message: 'Password should be at least 6 characters' 
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: weakPasswordError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('test@test.com', '123', 'client');

      expect(response.error?.message).toContain('Password');
    });

    it('deve lidar com email inválido', async () => {
      const invalidEmailError = { message: 'Invalid email' };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: invalidEmailError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('invalid-email', 'password123', 'client');

      expect(response.error?.message).toBe('Invalid email');
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe('Edge Cases', () => {
    it('deve lançar erro se useAuth for usado fora do AuthProvider', () => {
      // Renderizar sem wrapper do AuthProvider
      expect(() => {
        const { result } = renderHook(() => useAuth());
        // Tentar acessar qualquer propriedade
        result.current.user;
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('deve desinscrever listener ao desmontar', async () => {
      const unsubscribeMock = vi.fn();
      
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { 
          subscription: { 
            unsubscribe: unsubscribeMock 
          } 
        }
      } as any);

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('deve manter loading false após erro no getSession', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session error' } as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
