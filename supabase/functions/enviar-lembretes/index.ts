import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const BTZAP_URL = 'https://server.btzap.com.br/send/text'

function formatarTelefone(telefone: string): string {
  const apenasNumeros = telefone.replace(/\D/g, '')
  return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`
}

function formatarDataHora(data: string, hora: string): string {
  const dataObj = new Date(data + 'T' + hora)
  return dataObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const BTZAP_TOKEN = Deno.env.get('BTZAP_TOKEN')
    if (!BTZAP_TOKEN) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'BTZAP_TOKEN not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate tomorrow's date
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const amanhaStr = amanha.toISOString().split('T')[0]

    const depoisDeAmanha = new Date(amanha)
    depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1)
    const depoisDeAmanhaStr = depoisDeAmanha.toISOString().split('T')[0]

    // Fetch bookings for tomorrow
    const { data: agendamentos, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(display_name, phone),
        service:services(name),
        barber:barbers(name)
      `)
      .gte('booking_date', amanhaStr)
      .lt('booking_date', depoisDeAmanhaStr)
      .eq('whatsapp_reminder_sent', false)
      .eq('status', 'confirmed')
      .is('deleted_at', null)

    if (error) throw error

    let enviados = 0
    let erros = 0

    for (const agendamento of agendamentos || []) {
      try {
        if (!agendamento.client?.phone) {
          console.warn(`Agendamento ${agendamento.id}: cliente sem telefone`)
          erros++
          continue
        }

        const telefoneFormatado = formatarTelefone(agendamento.client.phone)
        const dataHoraFormatada = formatarDataHora(agendamento.booking_date, agendamento.booking_time)
        const clienteNome = agendamento.client.display_name || agendamento.client_name || 'Cliente'

        const mensagem =
          `🔔 *Lembrete de Agendamento*\n\n` +
          `Olá *${clienteNome}*!\n\n` +
          `Lembramos que você tem um horário marcado amanhã:\n\n` +
          `📅 *Data/Hora:* ${dataHoraFormatada}\n` +
          `✂️ *Serviço:* ${agendamento.service?.name || 'Serviço'}\n` +
          (agendamento.barber?.name ? `👨 *Barbeiro:* ${agendamento.barber.name}\n` : '') +
          `\n💈 *Barber360*\n` +
          `Nos vemos em breve!\n\n` +
          `_Caso precise remarcar, entre em contato!_ 📞`

        const response = await fetch(BTZAP_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'token': BTZAP_TOKEN,
          },
          body: JSON.stringify({
            number: telefoneFormatado,
            text: mensagem,
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errText}`)
        }
        await response.json()

        // Mark as sent
        await supabase
          .from('bookings')
          .update({
            whatsapp_reminder_sent: true,
            whatsapp_reminder_sent_at: new Date().toISOString(),
          })
          .eq('id', agendamento.id)

        enviados++
        console.log(`✅ Lembrete enviado para ${clienteNome} (${telefoneFormatado})`)
      } catch (err) {
        console.error(`❌ Erro no agendamento ${agendamento.id}:`, err)
        erros++
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        total_agendamentos: agendamentos?.length || 0,
        lembretes_enviados: enviados,
        erros,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Erro fatal:', error)
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
