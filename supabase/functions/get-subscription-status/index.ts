import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barbershopId } = await req.json();

    if (!barbershopId) {
      return new Response(
        JSON.stringify({ error: "barbershopId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get barbershop trial data
    const { data: barbershop, error: bsError } = await supabase
      .from("barbershops")
      .select("trial_start_date, trial_end_date, trial_used")
      .eq("id", barbershopId)
      .single();

    if (bsError) {
      console.error("Error fetching barbershop:", bsError);
      throw bsError;
    }

    // Get latest subscription with plan details
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*, stripe_plans(*)")
      .eq("barbershop_id", barbershopId)
      .in("status", ["ativo", "cancelado", "pendente"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
    }

    // Calculate trial status
    let trial = null;
    if (barbershop?.trial_end_date) {
      const trialEnd = new Date(barbershop.trial_end_date);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      trial = {
        days_left: Math.max(0, daysLeft),
        is_expired: daysLeft <= 0,
        trial_end_date: barbershop.trial_end_date,
        has_active_subscription: subscription?.status === "ativo",
      };
    }

    // Format subscription response
    let subResponse = null;
    if (subscription) {
      const stripePlan = subscription.stripe_plans;
      subResponse = {
        id: subscription.id,
        plan_type: subscription.plan_type,
        status: subscription.status,
        stripe_plan: stripePlan
          ? {
              plan_name: stripePlan.plan_name,
              billing_period: stripePlan.billing_period,
              price_monthly: stripePlan.price_monthly,
              max_professionals: stripePlan.max_professionals,
              price_total: stripePlan.price_total,
            }
          : null,
        current_period_end: subscription.current_period_end,
        canceled_at: subscription.canceled_at,
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    }

    return new Response(JSON.stringify({ trial, subscription: subResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-subscription-status:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
