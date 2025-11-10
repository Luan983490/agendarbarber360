import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabasePing = () => {
  useEffect(() => {
    const pingSupabase = async () => {
      try {
        // Requisição leve: apenas conta 1 registro da tabela 'barbershops'
        await supabase
          .from('barbershops')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        
        console.log('🔄 Ping enviado ao Supabase');
      } catch (error) {
        console.error('❌ Erro ao enviar ping ao Supabase:', error);
      }
    };

    // Ping imediato ao carregar
    pingSupabase();

    // Ping a cada 4 horas (14400000ms) enquanto o app estiver aberto
    const intervalId = setInterval(pingSupabase, 4 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);
};
