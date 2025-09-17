import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, Scissors, ShoppingBag, Wifi, Car, Coffee, AirVent, Volume2 } from "lucide-react";
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
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

  const products = [
    { id: "pomada", name: "Pomada Modeladora", price: "R$ 35", brand: "Premium Hair" },
    { id: "shampoo", name: "Shampoo Anticaspa", price: "R$ 28", brand: "BarberCare" },
    { id: "oleo", name: "Óleo para Barba", price: "R$ 45", brand: "Beard Master" },
    { id: "cera", name: "Cera Fixadora", price: "R$ 32", brand: "Style Pro" },
    { id: "tonico", name: "Tônico Capilar", price: "R$ 38", brand: "Hair Force" },
  ];

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

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBooking = () => {
    // TODO: Implementar lógica de agendamento
    console.log("Agendamento:", {
      date: selectedDate,
      time: selectedTime,
      service: selectedService,
      barber: selectedBarber,
      products: selectedProducts,
      notes
    });
  };

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
  const productsTotal = selectedProductsData.reduce((sum, product) => {
    return sum + parseFloat(product.price.replace('R$ ', ''));
  }, 0);
  const servicePrice = selectedServiceData ? parseFloat(selectedServiceData.price.replace('R$ ', '')) : 0;
  const totalPrice = servicePrice + productsTotal;

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

          {/* Products Selection */}
          <div className="space-y-3">
            <Label>Produtos (opcional)</Label>
            <div className="grid gap-3">
              {products.map((product) => (
                <Card 
                  key={product.id} 
                  className={`cursor-pointer transition-all ${selectedProducts.includes(product.id) ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => toggleProduct(product.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">{product.price}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
                  {selectedProductsData.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Produtos:</span>
                      {selectedProductsData.map((product) => (
                        <div key={product.id} className="flex justify-between text-xs pl-2">
                          <span>• {product.name}</span>
                          <span>{product.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-2">
                    {selectedServiceData && (
                      <div className="flex justify-between text-sm">
                        <span>Subtotal Serviço:</span>
                        <span>{selectedServiceData.price}</span>
                      </div>
                    )}
                    {productsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Subtotal Produtos:</span>
                        <span>R$ {productsTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold mt-1">
                      <span>Total:</span>
                      <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
                    </div>
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