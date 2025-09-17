import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, Scissors } from "lucide-react";
import { useState } from "react";

interface BookingModalProps {
  children: React.ReactNode;
  barberShop: {
    name: string;
    image: string;
  };
}

export const BookingModal = ({ children, barberShop }: BookingModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [notes, setNotes] = useState("");

  const services = [
    { id: "corte", name: "Corte Masculino", price: "R$ 25", duration: "30 min" },
    { id: "barba", name: "Barba Completa", price: "R$ 20", duration: "20 min" },
    { id: "combo", name: "Corte + Barba", price: "R$ 40", duration: "45 min" },
    { id: "tratamento", name: "Tratamento Capilar", price: "R$ 35", duration: "40 min" },
  ];

  const barbers = [
    { id: "joao", name: "João Silva", specialty: "Especialista em cortes clássicos" },
    { id: "pedro", name: "Pedro Santos", specialty: "Expert em barbas" },
    { id: "carlos", name: "Carlos Lima", specialty: "Cortes modernos" },
  ];

  const availableTimes = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30"
  ];

  const handleBooking = () => {
    // TODO: Implementar lógica de agendamento
    console.log("Agendamento:", {
      date: selectedDate,
      time: selectedTime,
      service: selectedService,
      barber: selectedBarber,
      notes
    });
  };

  const selectedServiceData = services.find(s => s.id === selectedService);

  return (
    <Dialog>
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
            <Label>Escolha o serviço</Label>
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
                        <p className="text-sm text-muted-foreground">{service.duration}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">{service.price}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Barber Selection */}
          <div className="space-y-3">
            <Label>Escolha o profissional</Label>
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um barbeiro" />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{barber.name}</div>
                        <div className="text-xs text-muted-foreground">{barber.specialty}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label>Escolha a data</Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                className="rounded-md border"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <Label>Escolha o horário</Label>
            <div className="grid grid-cols-4 gap-2">
              {availableTimes.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTime(time)}
                  className={selectedTime === time ? "bg-gradient-primary" : ""}
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
                    <span>Profissional:</span>
                    <span className="font-medium">{barbers.find(b => b.id === selectedBarber)?.name || "A definir"}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{selectedServiceData?.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              variant="gradient" 
              className="flex-1"
              onClick={handleBooking}
              disabled={!selectedService || !selectedDate || !selectedTime}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Confirmar Agendamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};