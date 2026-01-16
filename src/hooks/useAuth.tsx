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
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

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
    await authService.signOut();
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