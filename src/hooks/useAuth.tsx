import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userType: 'client' | 'barbershop_owner' | 'barber') => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // CRITICAL: Ignore auth events when on special pages
        // This prevents auto-login during password recovery and MFA verification flows
        const currentPath = window.location.pathname;
        const isSpecialPage = currentPath === '/reset-password' || currentPath === '/verify-mfa';
        
        if (isSpecialPage && event === 'SIGNED_IN') {
          console.log('[Auth] Ignoring SIGNED_IN on special page:', currentPath);
          // Ainda atualiza o estado, mas não dispara redirects
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }
        
        console.log('[Auth] Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session - also ignore on special pages
    const currentPath = window.location.pathname;
    const isSpecialPage = currentPath === '/reset-password' || currentPath === '/verify-mfa';
    if (!isSpecialPage) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userType: 'client' | 'barbershop_owner' | 'barber') => {
    const result = await authService.signUp({ email, password, userType });

    if (!result.success) {
      toast({
        title: "Erro no cadastro",
        description: result.error?.message || 'Erro ao criar conta',
        variant: "destructive"
      });
      return { error: result.error };
    }

    toast({
      title: "Cadastro realizado!",
      description: "Verifique seu email para confirmar a conta."
    });

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn({ email, password });

    if (!result.success) {
      // The service already handles subscription check and returns appropriate error
      toast({
        title: "Erro no login",
        description: result.error?.message || 'Erro ao fazer login',
        variant: "destructive"
      });
      return { error: result.error };
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      // Limpar estado local ANTES de fazer signOut no Supabase
      // Isso garante que a UI responde mesmo se o signOut falhar
      setUser(null);
      setSession(null);
      
      // Tentar fazer signOut no Supabase (pode falhar se sessão já expirou)
      await authService.signOut();
    } catch (error) {
      console.error('[Auth] Erro no signOut:', error);
      // Ignorar erro - estado local já foi limpo
    }
    
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso."
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};