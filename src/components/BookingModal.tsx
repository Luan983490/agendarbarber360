import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Scissors, Wifi, Car, Coffee, AirVent, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingModalProps {
  children: React.ReactNode;
  barberShop: {
    id: string;
    name: string;
    image: string;
  };
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

export const BookingModal = ({ children, barberShop }: BookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen, barberShop.id]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barberShop.id)
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar serviços",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const amenities = [
    { id: "wifi", name: "Wi-Fi Gratuito", icon: Wifi },
    { id: "estacionamento", name: "Estacionamento", icon: Car },
    { id: "cafe", name: "Café Cortesia", icon: Coffee },
    { id: "ar", name: "Ar Condicionado", icon: AirVent },
    { id: "som", name: "Som Ambiente", icon: Volume2 },
  ];

  const availableTimes = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30"
  ];

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer um agendamento",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDate || !selectedTime || !selectedService) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios: data, horário e serviço",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const selectedServiceData = services.find(s => s.id === selectedService);
      if (!selectedServiceData) {
        throw new Error("Serviço não encontrado");
      }

      // Format date for database (YYYY-MM-DD)
      const bookingDate = selectedDate.toISOString().split('T')[0];
      
      console.log("Dados do agendamento:", {
        client_id: user.id,
        barbershop_id: barberShop.id,
        service_id: selectedService,
        booking_date: bookingDate,
        booking_time: selectedTime,
        total_price: selectedServiceData.price,
        notes: notes || null,
        status: 'pending'
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          barbershop_id: barberShop.id,
          service_id: selectedService,
          booking_date: bookingDate,
          booking_time: selectedTime,
          total_price: selectedServiceData.price,
          notes: notes || null,
          status: 'pending'
        })
        .select();

      if (error) {
        console.error("Erro do Supabase:", error);
        throw error;
      }

      console.log("Agendamento criado:", data);

      toast({
        title: "Agendamento realizado!",
        description: "Seu agendamento foi criado com sucesso. Você receberá uma confirmação em breve.",
      });

      // Reset form
      setSelectedDate(new Date());
      setSelectedTime("");
      setSelectedService("");
      setNotes("");
      setIsOpen(false);

    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceData = services.find(s => s.id === selectedService);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Serviço - {barberShop.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-3">
            <Label>Escolha o serviço *</Label>
            {services.length > 0 ? (
              <div className="grid gap-3">
                {services.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-all ${selectedService === service.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Scissors className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-muted-foreground">{service.duration} min</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary">R$ {service.price.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Esta barbearia ainda não cadastrou serviços.</p>
                  <p className="text-sm">Entre em contato para mais informações.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {services.length > 0 && (
            <>
              {/* Amenities */}
              <div className="space-y-3">
                <Label>Comodidades disponíveis</Label>
                <div className="grid grid-cols-2 gap-3">
                  {amenities.map((amenity) => {
                    const IconComponent = amenity.icon;
                    return (
                      <div key={amenity.id} className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <span className="text-sm">{amenity.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-3">
                <Label>Escolha a data *</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-md border"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  * Fechado aos domingos
                </p>
              </div>

              {/* Time Selection */}
              <div className="space-y-3">
                <Label>Escolha o horário *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {time}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Alguma observação especial para o seu atendimento?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              {selectedService && selectedDate && selectedTime && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Resumo do agendamento</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Serviço:</span>
                        <span className="font-medium">{selectedServiceData?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data:</span>
                        <span className="font-medium">{selectedDate?.toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Horário:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duração:</span>
                        <span className="font-medium">{selectedServiceData?.duration} min</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-primary">R$ {selectedServiceData?.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={handleBooking}
                  disabled={!selectedService || !selectedDate || !selectedTime || loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};