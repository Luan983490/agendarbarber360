import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =====================================================
// Rate Limiter Edge Function
// Middleware para verificar e aplicar rate limiting
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Headers de segurança
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://*.supabase.co",
};

// Configurações de rate limit por tipo de ação
const RATE_LIMIT_CONFIG: Record<string, { maxAttempts: number; windowMinutes: number }> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  signup: { maxAttempts: 3, windowMinutes: 60 },
  booking_create: { maxAttempts: 10, windowMinutes: 60 },
  slots_query: { maxAttempts: 60, windowMinutes: 1 },
  password_reset: { maxAttempts: 3, windowMinutes: 60 },
  api_call: { maxAttempts: 100, windowMinutes: 1 },
};

interface RateLimitRequest {
  action: string;
  userId?: string;
  ipAddress?: string;
}

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  remaining_attempts: number;
  reset_at: string | null;
  blocked_until: string | null;
}

// Helper para extrair IP do request
function getClientIP(req: Request): string {
  // Tentar headers comuns de proxies
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for pode conter múltiplos IPs, pegar o primeiro
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback para CF-Connecting-IP (Cloudflare)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }
  
  // IP padrão para desenvolvimento local
  return '127.0.0.1';
}

// Helper para calcular tempo restante em formato legível
function formatTimeRemaining(blockedUntil: string): string {
  const now = new Date();
  const blocked = new Date(blockedUntil);
  const diffMs = blocked.getTime() - now.getTime();
  
  if (diffMs <= 0) return '0 minutos';
  
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));
  
  if (diffMinutes >= 60) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return mins > 0 ? `${hours} hora(s) e ${mins} minuto(s)` : `${hours} hora(s)`;
  }
  
  return `${diffMinutes} minuto(s)`;
}

// Logger estruturado
function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apenas POST é permitido
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body
    const body: RateLimitRequest = await req.json();
    const { action, userId } = body;
    
    // Validar ação
    if (!action || !RATE_LIMIT_CONFIG[action]) {
      log('warn', 'Ação de rate limit inválida', { action });
      return new Response(
        JSON.stringify({ error: 'Ação inválida', validActions: Object.keys(RATE_LIMIT_CONFIG) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter IP do cliente
    const ipAddress = body.ipAddress || getClientIP(req);
    
    // Criar cliente Supabase com service role para acessar tabela com RLS restritivo
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Obter configuração de rate limit
    const config = RATE_LIMIT_CONFIG[action];
    
    // Chamar função de verificação de rate limit
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_ip_address: ipAddress,
      p_action_type: action,
      p_user_id: userId || null,
      p_max_attempts: config.maxAttempts,
      p_window_minutes: config.windowMinutes,
    });

    if (error) {
      log('error', 'Erro ao verificar rate limit', { error: error.message, action, ipAddress });
      // Em caso de erro, permitir a requisição (fail open para não bloquear usuários)
      return new Response(
        JSON.stringify({
          allowed: true,
          warning: 'Rate limit check failed, request allowed',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0] as RateLimitResult | undefined;
    
    if (!result) {
      log('error', 'Resultado de rate limit vazio', { action, ipAddress });
      return new Response(
        JSON.stringify({ allowed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log da verificação
    log(result.allowed ? 'info' : 'warn', 'Rate limit verificado', {
      action,
      ipAddress: ipAddress.substring(0, 8) + '***', // Parcialmente oculto para privacidade
      allowed: result.allowed,
      currentCount: result.current_count,
      remainingAttempts: result.remaining_attempts,
    });

    // Se bloqueado, retornar 429
    if (!result.allowed) {
      const timeRemaining = result.blocked_until 
        ? formatTimeRemaining(result.blocked_until)
        : 'alguns minutos';
      
      log('warn', 'Rate limit excedido', { action, ipAddress: ipAddress.substring(0, 8) + '***' });
      
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Muitas tentativas. Tente novamente em ${timeRemaining}.`,
          retryAfter: result.blocked_until,
          currentCount: result.current_count,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': result.blocked_until || '',
          } 
        }
      );
    }

    // Rate limit OK
    return new Response(
      JSON.stringify({
        allowed: true,
        remainingAttempts: result.remaining_attempts,
        resetAt: result.reset_at,
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(config.maxAttempts),
          'X-RateLimit-Remaining': String(result.remaining_attempts),
          'X-RateLimit-Reset': result.reset_at || '',
        } 
      }
    );

  } catch (err) {
    log('error', 'Erro inesperado no rate limiter', { error: String(err) });
    
    // Em caso de erro, permitir a requisição (fail open)
    return new Response(
      JSON.stringify({
        allowed: true,
        warning: 'Rate limit check failed, request allowed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
