import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BARBERSHOP_NAMES = ["Barbearia Style", "Barber King", "Navalha de Ouro", "Corte & Arte", "Barbearia Premium", "The Barber House", "Barbearia Elegance", "Corte Fino", "Barbearia Imperial", "Barber Studio", "Dom Barbeiro", "Barbearia Clássica", "Barber Shop VIP", "Barbearia Moderna", "Corte Real", "Barbearia Central", "Barber & Co", "Barbearia Vintage", "Navalha Afiada", "Barbearia Express"];
const FIRST_NAMES = ["João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Carlos", "Diego", "André", "Bruno", "Felipe", "Thiago", "Rodrigo", "Marcelo", "Eduardo"];
const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Ferreira", "Almeida", "Ribeiro", "Gomes"];
const SERVICES_TPL = [
  { name: "Corte Masculino", price: 45, duration: 30 },
  { name: "Barba", price: 30, duration: 15 },
  { name: "Corte + Barba", price: 65, duration: 45 },
  { name: "Degradê", price: 50, duration: 30 },
  { name: "Hidratação", price: 40, duration: 30 },
];
const CITIES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre", "Salvador", "Fortaleza", "Recife", "Brasília", "Goiânia"];
const STATES = ["SP", "RJ", "MG", "PR", "RS", "BA", "CE", "PE", "DF", "GO"];

function r<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function ri(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

function futureDate(d: number): string {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  if (dt.getDay() === 0) dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split("T")[0];
}

function randomTime(): string {
  const p = r([{ s: 540, e: 690 }, { s: 780, e: 1095 }]);
  const slots = (p.e - p.s) / 15;
  const m = p.s + ri(0, slots) * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "full";
    const runId = body.run_id || Date.now().toString(36);
    
    if (mode === "create_users_sequential") {
      // Create users one by one with delay to avoid rate limiting
      const { type = "owner", count = 50, offset = 0 } = body;
      const users: { id: string; email: string }[] = [];
      
      for (let i = 0; i < count; i++) {
        const idx = offset + i + 1;
        const email = `lt_${runId}_${type}_${idx}@loadtest.barber360.app`;
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: "LoadTest@2026!Secure",
          email_confirm: true,
          user_metadata: {
            display_name: `${r(FIRST_NAMES)} ${r(LAST_NAMES)}`,
            user_type: type === "owner" ? "barbershop_owner" : "client",
          },
        });
        if (error) { console.warn(`[${idx}] ${error.message}`); continue; }
        users.push({ id: data.user.id, email: data.user.email! });
        
        // Delay every 5 users to let triggers complete
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return new Response(JSON.stringify({ created: users.length, user_ids: users.map(u => u.id) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (mode === "create_barbershops") {
      const { owner_ids } = body as { owner_ids: string[] };
      if (!owner_ids?.length) return new Response(JSON.stringify({ error: "No owner_ids" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const inserts = owner_ids.map((oid: string, i: number) => ({
        owner_id: oid,
        name: `${r(BARBERSHOP_NAMES)} ${runId}-${i}`,
        slug: `lt-${runId}-${i}-${ri(1000, 9999)}`,
        address: `Rua Teste, ${ri(1, 9999)}`,
        city: CITIES[i % 10], state: STATES[i % 10], country: "Brasil",
        neighborhood: "Centro",
        postal_code: `${ri(10000, 99999)}-${ri(100, 999)}`,
        has_active_barbers: true, is_public: true,
        latitude: -23.55 + (Math.random() - 0.5) * 10,
        longitude: -46.63 + (Math.random() - 0.5) * 10,
        haircut_price: ri(25, 80),
      }));
      
      const ids: string[] = [];
      for (let i = 0; i < inserts.length; i += 200) {
        const { data, error } = await supabaseAdmin.from("barbershops").insert(inserts.slice(i, i + 200)).select("id");
        if (error) { console.error("bs:", error.message); continue; }
        ids.push(...data.map((b: { id: string }) => b.id));
      }
      
      return new Response(JSON.stringify({ barbershops: ids.length, barbershop_ids: ids }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (mode === "create_services_barbers") {
      const { barbershop_ids } = body as { barbershop_ids: string[] };
      if (!barbershop_ids?.length) return new Response(JSON.stringify({ error: "No barbershop_ids" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      // Services
      const svcInserts: Record<string, unknown>[] = [];
      for (const bsId of barbershop_ids) {
        const svcs = [...SERVICES_TPL].sort(() => Math.random() - 0.5).slice(0, ri(3, 5));
        for (const s of svcs) {
          svcInserts.push({ barbershop_id: bsId, name: s.name, price: Math.max(1, s.price + ri(-5, 15)), duration: s.duration, description: `Serviço de ${s.name.toLowerCase()}` });
        }
      }
      for (let i = 0; i < svcInserts.length; i += 500) {
        const { error } = await supabaseAdmin.from("services").insert(svcInserts.slice(i, i + 500));
        if (error) console.error("svc:", error.message);
      }
      
      // Barbers
      const brInserts: Record<string, unknown>[] = [];
      for (const bsId of barbershop_ids) {
        for (let b = 0; b < ri(1, 3); b++) {
          brInserts.push({ barbershop_id: bsId, name: `${r(FIRST_NAMES)} ${r(LAST_NAMES)}`, is_active: true, specialty: r(["Corte", "Barba", "Degradê"]) });
        }
      }
      const barberIds: string[] = [];
      for (let i = 0; i < brInserts.length; i += 500) {
        const { data, error } = await supabaseAdmin.from("barbers").insert(brInserts.slice(i, i + 500)).select("id");
        if (error) { console.error("br:", error.message); continue; }
        barberIds.push(...data.map((b: { id: string }) => b.id));
      }
      
      // Working hours
      const whInserts: Record<string, unknown>[] = [];
      for (const bid of barberIds) {
        for (let dow = 0; dow < 7; dow++) {
          whInserts.push({ barber_id: bid, day_of_week: dow, period1_start: "09:00", period1_end: "12:00", period2_start: "13:00", period2_end: "19:00", is_day_off: dow === 0 });
        }
      }
      for (let i = 0; i < whInserts.length; i += 1000) {
        const { error } = await supabaseAdmin.from("barber_working_hours").insert(whInserts.slice(i, i + 1000));
        if (error) console.error("wh:", error.message);
      }
      
      return new Response(JSON.stringify({ services: svcInserts.length, barbers: barberIds.length, working_hours: whInserts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (mode === "create_bookings") {
      const { client_ids, count = 500 } = body as { client_ids: string[]; count: number };
      if (!client_ids?.length) return new Response(JSON.stringify({ error: "No client_ids" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const { data: allSvcs } = await supabaseAdmin.from("services").select("id, barbershop_id, duration, price").eq("is_active", true).limit(5000);
      const { data: allBrs } = await supabaseAdmin.from("barbers").select("id, barbershop_id").eq("is_active", true).limit(5000);
      
      if (!allSvcs?.length || !allBrs?.length) return new Response(JSON.stringify({ bookings: 0, error: "No services/barbers" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const sm: Record<string, typeof allSvcs> = {};
      for (const s of allSvcs) { if (!sm[s.barbershop_id]) sm[s.barbershop_id] = []; sm[s.barbershop_id].push(s); }
      const bm: Record<string, string[]> = {};
      for (const b of allBrs) { if (!bm[b.barbershop_id]) bm[b.barbershop_id] = []; bm[b.barbershop_id].push(b.id); }
      
      const valid = Object.keys(sm).filter(id => bm[id]?.length > 0);
      if (!valid.length) return new Response(JSON.stringify({ bookings: 0, error: "No valid barbershops" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const ins: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const bsId = valid[i % valid.length];
        const svc = r(sm[bsId]);
        const time = randomTime();
        const [h, m] = time.split(":").map(Number);
        const end = h * 60 + m + svc.duration;
        ins.push({
          barbershop_id: bsId, service_id: svc.id, barber_id: r(bm[bsId]),
          client_id: client_ids[i % client_ids.length],
          booking_date: futureDate(ri(1, 30)), booking_time: time,
          booking_end_time: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
          total_price: svc.price, status: r(["pending", "confirmed", "confirmed", "confirmed"]),
          is_external_booking: false,
        });
      }
      
      let created = 0;
      for (let i = 0; i < ins.length; i += 500) {
        const { data, error } = await supabaseAdmin.from("bookings").insert(ins.slice(i, i + 500)).select("id");
        if (error) { console.error("bk:", error.message); continue; }
        created += data.length;
      }
      
      return new Response(JSON.stringify({ bookings: created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "status") {
      const { data: usersCount } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
      const { data: bsCount } = await supabaseAdmin.from("barbershops").select("id", { count: "exact", head: true });
      const { data: bkCount } = await supabaseAdmin.from("bookings").select("id", { count: "exact", head: true });
      
      return new Response(JSON.stringify({ profiles: usersCount, barbershops: bsCount, bookings: bkCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: "Use modes: create_users_sequential, create_barbershops, create_services_barbers, create_bookings, status" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
