import { http, HttpResponse } from 'msw';

// URL base do Supabase
const SUPABASE_URL = 'https://ppmiandwpebzsfqqhhws.supabase.co';

// ============================================
// HANDLERS MSW PARA MOCK DE APIS
// ============================================

export const handlers = [
  // Mock de autenticação
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      }
    });
  }),

  // Mock de signup
  http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json({
      id: 'new-user-id',
      email: 'newuser@example.com',
      created_at: new Date().toISOString()
    });
  }),

  // Mock de logout
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Mock de sessão
  http.get(`${SUPABASE_URL}/auth/v1/session`, () => {
    return HttpResponse.json({
      data: { session: null },
      error: null
    });
  }),

  // Mock de barbershops
  http.get(`${SUPABASE_URL}/rest/v1/barbershops`, () => {
    return HttpResponse.json([
      {
        id: 'barbershop-1',
        name: 'Barbearia Premium',
        address: 'Rua das Flores, 123',
        phone: '11999999999',
        rating: 4.8,
        total_reviews: 150
      },
      {
        id: 'barbershop-2',
        name: 'Classic Barber',
        address: 'Av. Principal, 456',
        phone: '11888888888',
        rating: 4.5,
        total_reviews: 80
      }
    ]);
  }),

  // Mock de serviços
  http.get(`${SUPABASE_URL}/rest/v1/services`, () => {
    return HttpResponse.json([
      {
        id: 'service-1',
        name: 'Corte Tradicional',
        price: 35.0,
        duration: 30,
        is_active: true
      },
      {
        id: 'service-2',
        name: 'Barba Completa',
        price: 25.0,
        duration: 30,
        is_active: true
      },
      {
        id: 'service-3',
        name: 'Corte + Barba',
        price: 55.0,
        duration: 60,
        is_active: true
      }
    ]);
  }),

  // Mock de barbeiros
  http.get(`${SUPABASE_URL}/rest/v1/barbers`, () => {
    return HttpResponse.json([
      {
        id: 'barber-1',
        name: 'João Silva',
        specialty: 'Corte masculino',
        is_active: true
      },
      {
        id: 'barber-2',
        name: 'Pedro Santos',
        specialty: 'Barba e bigode',
        is_active: true
      }
    ]);
  }),

  // Mock de agendamentos
  http.get(`${SUPABASE_URL}/rest/v1/bookings`, () => {
    return HttpResponse.json([
      {
        id: 'booking-1',
        booking_date: new Date().toISOString().split('T')[0],
        booking_time: '10:00',
        status: 'confirmed',
        total_price: 35.0
      }
    ]);
  }),

  // Mock de criação de agendamento
  http.post(`${SUPABASE_URL}/rest/v1/bookings`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'new-booking-id',
      ...(body as object),
      created_at: new Date().toISOString()
    }, { status: 201 });
  }),

  // Mock de profiles
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return HttpResponse.json([
      {
        user_id: 'user-1',
        display_name: 'Cliente Teste',
        phone: '11999999999',
        user_type: 'client'
      }
    ]);
  }),

  // Mock de RPC functions
  http.post(`${SUPABASE_URL}/rest/v1/rpc/*`, () => {
    return HttpResponse.json({ success: true });
  })
];

// Handler para erros (útil em testes específicos)
export const errorHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/barbershops`, () => {
    return HttpResponse.json(
      { message: 'Database error' } as Record<string, string>,
      { status: 500 }
    );
  }),

  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  })
];
