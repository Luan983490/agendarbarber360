import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ServiceSelectionStep } from "./ServiceSelectionStep";
import { DateTimeSelectionStep } from "./DateTimeSelectionStep";
import { BookingAuthDialog } from "./BookingAuthDialog";
import { BookingSuccessDialog } from "./BookingSuccessDialog";
import { enviarConfirmacaoWhatsApp } from "@/utils/whatsapp";
import { savePendingBooking } from "@/hooks/usePendingBooking";

interface BarbershopDetails {
  slug?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string;
  opening_hours?: any;
  amenities?: string[] | null;
  postal_code?: string | null;
  neighborhood?: string | null;
  street_number?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  payment_methods?: string[] | null;
}

interface BookingFlowProps {
  children: React.ReactNode;
  barbershop: {
    id: string;
    name: string;
    image?: string;
    address?: string;
    rating?: number;
  };
  autoOpen?: boolean;
  onBackFromAutoOpen?: () => void;
  rescheduleBookingId?: string;
  prefetchedServices?: Service[];
  prefetchedBarbers?: Barber[];
  prefetchedBarbershopDetails?: BarbershopDetails;
  prefetchedWorkingHours?: any[] | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  image_url?: string;
}

interface SelectedServiceItem {
  service: Service;
  barber?: Barber;
  time?: string;
}

type BookingStep = "services" | "datetime";

export const BookingFlow = ({ children, barbershop, autoOpen = false, onBackFromAutoOpen, rescheduleBookingId, prefetchedServices, prefetchedBarbers, prefetchedBarbershopDetails, prefetchedWorkingHours }: BookingFlowProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [currentStep, setCurrentStep] = useState<BookingStep>("services");
  const [services, setServices] = useState<Service[]>(prefetchedServices || []);
  const [barbers, setBarbers] = useState<Barber[]>(prefetchedBarbers || []);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const pendingBookingRef = useRef(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (!prefetchedServices) fetchServices();
      if (!prefetchedBarbers) fetchBarbers();
    }
  }, [isOpen, barbershop.id]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar serviços",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, specialty, image_url")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .eq("available_in_app", true)
        .eq("available_in_presentation", true)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar barbeiros",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleSelectService = (service: Service) => {
    setSelectedServices([{ service }]);
    setCurrentServiceIndex(0);
    setCurrentStep("datetime");
  };

  const handleAddService = () => {
    setCurrentStep("services");
  };

  const handleBack = () => {
    if (currentStep === "datetime") {
      setCurrentStep("services");
      setSelectedServices([]);
      setSelectedTime("");
      setSelectedBarber("");
    } else {
      setIsOpen(false);
    }
  };

  const submitBooking = useCallback(async () => {
    // Get current user from supabase directly (in case auth just happened)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate || !selectedTime || selectedServices.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const mainService = selectedServices[0].service;
      const bookingDate = selectedDate.toISOString().split("T")[0];

      if (selectedBarber) {
        const { data: blocks, error: blocksError } = await supabase
          .from("barber_blocks")
          .select("*")
          .eq("barber_id", selectedBarber)
          .eq("block_date", bookingDate);

        if (blocksError) throw blocksError;

        const isBlocked = blocks?.some((block) => {
          return selectedTime >= block.start_time && selectedTime < block.end_time;
        });

        if (isBlocked) {
          toast({
            title: "Horário indisponível",
            description: "Este horário está bloqueado. Por favor, escolha outro.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", currentUser.id)
        .single();

      const totalPrice = selectedServices.reduce((sum, item) => sum + item.service.price, 0);

      const { data: newBooking, error } = await supabase
        .from("bookings")
        .insert({
          client_id: currentUser.id,
          barbershop_id: barbershop.id,
          service_id: mainService.id,
          barber_id: selectedBarber || null,
          booking_date: bookingDate,
          booking_time: selectedTime,
          total_price: totalPrice,
          status: "pending",
          client_name: profileData?.display_name || "Cliente",
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If rescheduling, cancel the old booking
      if (rescheduleBookingId) {
        const { error: cancelError } = await supabase
          .from("bookings")
          .update({ status: "cancelled", notes: `Reagendado para ${bookingDate} às ${selectedTime}` })
          .eq("id", rescheduleBookingId);

        if (cancelError) {
          console.error("Erro ao cancelar agendamento anterior:", cancelError);
        }
      }

      // Send WhatsApp confirmation (fire-and-forget)
      if (newBooking?.id) {
        enviarConfirmacaoWhatsApp(newBooking.id).catch(err => {
          console.error('Erro ao enviar WhatsApp:', err);
        });
      }

      resetForm();
      setIsOpen(false);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedTime, selectedServices, selectedBarber, barbershop.id, notes, toast]);

  const handleContinue = async () => {
    if (!user) {
      // User not logged in - show auth dialog, booking will auto-submit after auth
      pendingBookingRef.current = true;
      setShowAuthDialog(true);
      return;
    }
    await submitBooking();
  };

  const handleAuthSuccess = useCallback((isSignup?: boolean) => {
    setIsNewSignup(!!isSignup);
    if (pendingBookingRef.current) {
      pendingBookingRef.current = false;
      if (isSignup) {
        // Save booking data to localStorage so it auto-submits after email confirmation
        if (selectedServices.length > 0 && selectedDate && selectedTime) {
          const mainService = selectedServices[0].service;
          const bookingDate = selectedDate.toISOString().split("T")[0];
          const totalPrice = selectedServices.reduce((sum, item) => sum + item.service.price, 0);
          savePendingBooking({
            barbershopId: barbershop.id,
            serviceId: mainService.id,
            barberId: selectedBarber || null,
            bookingDate,
            bookingTime: selectedTime,
            totalPrice,
            notes: notes.trim() || null,
            createdAt: Date.now(),
          });
        }
        resetForm();
        setIsOpen(false);
        setShowSuccessDialog(true);
      } else {
        // Login — session is valid, submit the booking
        setTimeout(() => {
          submitBooking();
        }, 300);
      }
    }
  }, [submitBooking, selectedServices, selectedDate, selectedTime, selectedBarber, barbershop.id, notes]);

  const resetForm = () => {
    setCurrentStep("services");
    setSelectedServices([]);
    setCurrentServiceIndex(0);
    setSelectedDate(new Date());
    setSelectedTime("");
    setSelectedBarber("");
    setNotes("");
  };

  if (!isOpen) {
    return (
      <>
        <div onClick={() => setIsOpen(true)}>{children}</div>
        <BookingSuccessDialog
          open={showSuccessDialog}
          isNewSignup={isNewSignup}
          isReschedule={!!rescheduleBookingId}
          onContinue={() => {
            setShowSuccessDialog(false);
            setIsNewSignup(false);
            if (!isNewSignup) navigate('/my-bookings');
          }}
        />
      </>
    );
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {currentStep === "services" && (
            <ServiceSelectionStep
              barbershop={barbershop}
              services={services}
              onSelectService={handleSelectService}
              onBack={() => {
                if (onBackFromAutoOpen) {
                  onBackFromAutoOpen();
                } else {
                  setIsOpen(false);
                }
              }}
              prefetchedBarbershopDetails={prefetchedBarbershopDetails}
              prefetchedWorkingHoursData={prefetchedWorkingHours}
            />
          )}

          {currentStep === "datetime" && (
            <DateTimeSelectionStep
              barbershopId={barbershop.id}
              selectedServices={selectedServices}
              currentServiceIndex={currentServiceIndex}
              barbers={barbers}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedBarber={selectedBarber}
              onDateChange={setSelectedDate}
              onTimeChange={setSelectedTime}
              onBarberChange={setSelectedBarber}
              onBack={handleBack}
              onContinue={handleContinue}
              onAddService={handleAddService}
              loading={loading}
              notes={notes}
              onNotesChange={setNotes}
            />
          )}
        </div>
      </div>

      <BookingAuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthSuccess={handleAuthSuccess}
      />

      <BookingSuccessDialog
        open={showSuccessDialog}
        isNewSignup={isNewSignup}
        isReschedule={!!rescheduleBookingId}
        onContinue={() => {
          setShowSuccessDialog(false);
          setIsNewSignup(false);
          if (!isNewSignup) navigate('/my-bookings');
        }}
      />
    </>
  );
};
