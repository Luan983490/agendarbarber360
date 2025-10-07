import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabasePing = () => {
  useEffect(() => {
    const pingSupabase = async () => {
      const lastPing = localStorage.getItem('lastPing');
      const today = new Date().toDateString();

      // Só executa o ping se ainda não foi feito hoje
      if (lastPing !== today) {
        try {
          // Requisição leve: apenas conta 1 registro da tabela 'barbershops'
          await supabase
            .from('barbershops')
            .select('id', { count: 'exact', head: true })
            .limit(1);
          
          localStorage.setItem('lastPing', today);
          console.log('🔄 Ping diário enviado ao Supabase');
        } catch (error) {
          console.error('❌ Erro ao enviar ping ao Supabase:', error);
        }
      }
    };

    pingSupabase();
  }, []);
};
