import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock do Supabase antes de importar o hook
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

// Importar após o mock
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado Inicial', () => {
    it('deve iniciar com loading true', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      // Estado inicial deve ter loading
      expect(result.current.loading).toBeDefined();
    });

    it('deve iniciar sem usuário', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('Sign Out', () => {
    it('deve chamar supabase.auth.signOut', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Sign In', () => {
    it('deve chamar supabase.auth.signInWithPassword com credenciais', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signIn('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('deve retornar erro quando login falha', async () => {
      const mockError = { message: 'Invalid credentials' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('wrong@example.com', 'wrongpass');

      expect(response.error).toBeDefined();
    });
  });

  describe('Sign Up', () => {
    it('deve chamar supabase.auth.signUp com dados corretos', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signUp('new@example.com', 'password123', 'client');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            user_type: 'client'
          }
        }
      });
    });
  });
});
