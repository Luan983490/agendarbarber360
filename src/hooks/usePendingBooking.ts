import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { enviarConfirmacaoWhatsApp } from "@/utils/whatsapp";

const PENDING_BOOKING_KEY = "b360_pending_booking";

export interface PendingBookingData {
  barbershopId: string;
  serviceId: string;
  barberId: string | null;
  bookingDate: string;
  bookingTime: string;
  totalPrice: number;
  notes: string | null;
  createdAt: number; // timestamp to expire old entries
}

export const savePendingBooking = (data: PendingBookingData) => {
  localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(data));
};

export const clearPendingBooking = () => {
  localStorage.removeItem(PENDING_BOOKING_KEY);
};

const getPendingBooking = (): PendingBookingData | null => {
  try {
    const raw = localStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingBookingData;
    // Expire after 24 hours
    if (Date.now() - data.createdAt > 24 * 60 * 60 * 1000) {
      clearPendingBooking();
      return null;
    }
    return data;
  } catch {
    clearPendingBooking();
    return null;
  }
};

export const usePendingBooking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!user || processingRef.current) return;

    const pending = getPendingBooking();
    if (!pending) return;

    processingRef.current = true;

    const submitPending = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        // Check if barber slot is still available
        if (pending.barberId) {
          const { data: blocks } = await supabase
            .from("barber_blocks")
            .select("*")
            .eq("barber_id", pending.barberId)
            .eq("block_date", pending.bookingDate);

          const isBlocked = blocks?.some((block) =>
            pending.bookingTime >= block.start_time && pending.bookingTime < block.end_time
          );

          if (isBlocked) {
            toast({
              title: "Horário indisponível",
              description: "O horário que você escolheu foi bloqueado enquanto você confirmava o email. Por favor, agende novamente.",
              variant: "destructive",
            });
            clearPendingBooking();
            processingRef.current = false;
            return;
          }
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", currentUser.id)
          .single();

        const { data: newBooking, error } = await supabase
          .from("bookings")
          .insert({
            client_id: currentUser.id,
            barbershop_id: pending.barbershopId,
            service_id: pending.serviceId,
            barber_id: pending.barberId,
            booking_date: pending.bookingDate,
            booking_time: pending.bookingTime,
            total_price: pending.totalPrice,
            status: "pending",
            client_name: profileData?.display_name || "Cliente",
            notes: pending.notes,
          })
          .select()
          .single();

        if (error) throw error;

        // Send WhatsApp confirmation
        if (newBooking?.id) {
          enviarConfirmacaoWhatsApp(newBooking.id).catch(console.error);
        }

        clearPendingBooking();

        toast({
          title: "Agendamento confirmado! 🎉",
          description: "Seu agendamento pendente foi finalizado com sucesso!",
        });

        navigate("/my-bookings");
      } catch (error: any) {
        console.error("Erro ao criar agendamento pendente:", error);
        toast({
          title: "Erro ao finalizar agendamento",
          description: error.message || "Tente agendar novamente.",
          variant: "destructive",
        });
        clearPendingBooking();
      } finally {
        processingRef.current = false;
      }
    };

    // Small delay to ensure session is fully established
    setTimeout(submitPending, 500);
  }, [user, toast, navigate]);
};
