import { useState, useEffect } from "react";
import { X } from "lucide-react";
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

export const BookingFlow = ({ children, barbershop }: BookingFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<BookingStep>("services");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const availableTimes = [
    "06:00", "06:20", "06:40", "07:00", "07:20", "07:40",
    "08:00", "08:20", "08:40", "09:00", "09:20", "09:40",
    "10:00", "10:20", "10:40", "11:00", "11:20", "11:40",
    "12:00", "12:20", "12:40", "13:00", "13:20", "13:40",
    "14:00", "14:20", "14:40", "15:00", "15:20", "15:40",
    "16:00", "16:20", "16:40", "17:00", "17:20", "17:40",
    "18:00", "18:20", "18:40", "19:00", "19:20", "19:40",
    "20:00", "20:20", "20:40", "21:00",
  ];

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

  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchBlockedAndBookedTimes();
    } else {
      setBlockedTimes([]);
      setBookedTimes([]);
    }
  }, [selectedDate, selectedBarber]);

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

  const fetchBlockedAndBookedTimes = async () => {
    if (!selectedDate || !selectedBarber) return;

    const bookingDate = selectedDate.toISOString().split("T")[0];

    try {
      const { data: blocks, error: blocksError } = await supabase
        .from("barber_blocks")
        .select("start_time, end_time")
        .eq("barber_id", selectedBarber)
        .eq("block_date", bookingDate);

      if (blocksError) throw blocksError;

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("booking_time")
        .eq("barber_id", selectedBarber)
        .eq("booking_date", bookingDate)
        .in("status", ["pending", "confirmed"]);

      if (bookingsError) throw bookingsError;

      const blocked: string[] = [];
      blocks?.forEach((block) => {
        const startTime = block.start_time.substring(0, 5);
        const endTime = block.end_time.substring(0, 5);
        availableTimes.forEach((time) => {
          if (time >= startTime && time < endTime) {
            blocked.push(time);
          }
        });
      });

      const booked = bookings?.map((b) => b.booking_time.substring(0, 5)) || [];

      setBlockedTimes(blocked);
      setBookedTimes(booked);
    } catch (error: any) {
      console.error("Erro ao buscar horários indisponíveis:", error);
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
              onBack={() => setIsOpen(false)}
            />
          )}

          {currentStep === "datetime" && (
            <DateTimeSelectionStep
              selectedServices={selectedServices}
              currentServiceIndex={currentServiceIndex}
              availableTimes={availableTimes}
              blockedTimes={blockedTimes}
              bookedTimes={bookedTimes}
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
            />
          )}
        </div>
      </div>
    </>
  );
};
