import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ServiceSelectionStep } from "./ServiceSelectionStep";
import { DateTimeSelectionStep } from "./DateTimeSelectionStep";

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

export const BookingFlow = ({ children, barbershop, autoOpen = false, onBackFromAutoOpen }: BookingFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [currentStep, setCurrentStep] = useState<BookingStep>("services");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

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
      fetchServices();
      fetchBarbers();
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
        .eq("is_active", true);

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

  const handleContinue = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer um agendamento",
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
        .eq("user_id", user.id)
        .single();

      const totalPrice = selectedServices.reduce((sum, item) => sum + item.service.price, 0);

      const { error } = await supabase
        .from("bookings")
        .insert({
          client_id: user.id,
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

      toast({
        title: "Agendamento realizado!",
        description: "Seu agendamento foi criado com sucesso.",
      });

      resetForm();
      setIsOpen(false);
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
  };

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
    return <div onClick={() => setIsOpen(true)}>{children}</div>;
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      
      <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
        {/* Content - full height, no scroll container */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
    </>
  );
};
