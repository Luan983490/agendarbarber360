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
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { bookingId, type } = await req.json()

    if (!bookingId || !type) {
      return new Response(JSON.stringify({ error: 'bookingId and type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to fetch booking data with joins
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(display_name, phone),
        service:services(name),
        barber:barbers(name)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError)
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if already sent
    if (type === 'confirmation' && booking.whatsapp_confirmation_sent) {
      return new Response(JSON.stringify({ message: 'Already sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (type === 'reminder' && booking.whatsapp_reminder_sent) {
      return new Response(JSON.stringify({ message: 'Already sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phone = booking.client?.phone
    if (!phone) {
      console.warn(`Booking ${bookingId}: client has no phone`)
      return new Response(JSON.stringify({ message: 'Client has no phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const telefoneFormatado = formatarTelefone(phone)
    const dataHoraFormatada = formatarDataHora(booking.booking_date, booking.booking_time)
    const clienteNome = booking.client?.display_name || booking.client_name || 'Cliente'
    const servicoNome = booking.service?.name || 'Serviço'
    const barbeiroNome = booking.barber?.name

    let mensagem = ''

    if (type === 'confirmation') {
      mensagem =
        `✅ *Agendamento Confirmado!*\n\n` +
        `Olá *${clienteNome}*!\n\n` +
        `Seu agendamento foi confirmado com sucesso:\n\n` +
        `📅 *Data/Hora:* ${dataHoraFormatada}\n` +
        `✂️ *Serviço:* ${servicoNome}\n` +
        (barbeiroNome ? `👨 *Barbeiro:* ${barbeiroNome}\n` : '') +
        `\n💈 *Barber360*\n` +
        `Aguardamos você!\n\n` +
        `_Para reagendar ou cancelar, entre em contato conosco._`
    } else {
      mensagem =
        `🔔 *Lembrete de Agendamento*\n\n` +
        `Olá *${clienteNome}*!\n\n` +
        `Lembramos que você tem um horário marcado amanhã:\n\n` +
        `📅 *Data/Hora:* ${dataHoraFormatada}\n` +
        `✂️ *Serviço:* ${servicoNome}\n` +
        (barbeiroNome ? `👨 *Barbeiro:* ${barbeiroNome}\n` : '') +
        `\n💈 *Barber360*\n` +
        `Nos vemos em breve!\n\n` +
        `_Caso precise remarcar, entre em contato!_ 📞`
    }

    const BTZAP_TOKEN = Deno.env.get('BTZAP_TOKEN')
    if (!BTZAP_TOKEN) {
      console.error('BTZAP_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'WhatsApp service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const btzapResponse = await fetch(BTZAP_URL, {
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

    if (!btzapResponse.ok) {
      const errorText = await btzapResponse.text()
      console.error(`BTZap error: HTTP ${btzapResponse.status}`, errorText)
      return new Response(JSON.stringify({ error: `WhatsApp send failed: ${btzapResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const btzapResult = await btzapResponse.json()

    // Update booking flags
    const updateData =
      type === 'confirmation'
        ? { whatsapp_confirmation_sent: true, whatsapp_confirmation_sent_at: new Date().toISOString() }
        : { whatsapp_reminder_sent: true, whatsapp_reminder_sent_at: new Date().toISOString() }

    await supabaseAdmin.from('bookings').update(updateData).eq('id', bookingId)

    console.log(`✅ WhatsApp ${type} sent to ${clienteNome} (${telefoneFormatado})`)

    return new Response(JSON.stringify({ success: true, btzapResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
