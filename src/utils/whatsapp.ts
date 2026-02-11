import { supabase } from '@/integrations/supabase/client';

/**
 * Send WhatsApp confirmation for a booking via the send-whatsapp edge function.
 * This function is fire-and-forget — errors are logged but never thrown.
 */
export async function enviarConfirmacaoWhatsApp(bookingId: string): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      console.warn('[WhatsApp] Usuário não autenticado, ignorando envio');
      return;
    }

    const response = await supabase.functions.invoke('send-whatsapp', {
      body: { bookingId, type: 'confirmation' },
    });

    if (response.error) {
      console.error('[WhatsApp] Erro ao enviar confirmação:', response.error);
    } else {
      console.log('[WhatsApp] Confirmação enviada com sucesso para booking', bookingId);
    }
  } catch (error) {
    console.error('[WhatsApp] Erro inesperado ao enviar confirmação:', error);
  }
}
