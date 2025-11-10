import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Scissors, Wifi, Car, Coffee, AirVent, Volume2, User, ShoppingBag } from "lucide-react";
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

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  image_url?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

export const BookingModal = ({ children, barberShop }: BookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      fetchBarbers();
      fetchProducts();
    }
  }, [isOpen, barberShop.id]);

  // Buscar horários bloqueados e agendados quando data ou barbeiro mudar
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

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, specialty, image_url')
        .eq('barbershop_id', barberShop.id)
        .eq('is_active', true);

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar barbeiros",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barbershop_id', barberShop.id)
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchBlockedAndBookedTimes = async () => {
    if (!selectedDate || !selectedBarber) return;

    const bookingDate = selectedDate.toISOString().split('T')[0];

    try {
      // Buscar bloqueios
      const { data: blocks, error: blocksError } = await supabase
        .from('barber_blocks')
        .select('start_time, end_time')
        .eq('barber_id', selectedBarber)
        .eq('block_date', bookingDate);

      if (blocksError) throw blocksError;

      // Buscar agendamentos
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('barber_id', selectedBarber)
        .eq('booking_date', bookingDate)
        .in('status', ['pending', 'confirmed']);

      if (bookingsError) throw bookingsError;

      // Processar bloqueios para obter todos os horários bloqueados
      const blocked: string[] = [];
      blocks?.forEach(block => {
        const startTime = block.start_time.substring(0, 5);
        const endTime = block.end_time.substring(0, 5);
        availableTimes.forEach(time => {
          if (time >= startTime && time < endTime) {
            blocked.push(time);
          }
        });
      });

      // Processar agendamentos
      const booked = bookings?.map(b => b.booking_time.substring(0, 5)) || [];

      setBlockedTimes(blocked);
      setBookedTimes(booked);
    } catch (error: any) {
      console.error('Erro ao buscar horários indisponíveis:', error);
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

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

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

      // Check if selected barber has any blocks for this date/time
      if (selectedBarber) {
        const { data: blocks, error: blocksError } = await supabase
          .from('barber_blocks')
          .select('*')
          .eq('barber_id', selectedBarber)
          .eq('block_date', bookingDate);

        if (blocksError) throw blocksError;

        const isBlocked = blocks?.some(block => {
          return selectedTime >= block.start_time && selectedTime < block.end_time;
        });

        if (isBlocked) {
          toast({
            title: "Horário indisponível",
            description: "Este horário está bloqueado pelo barbeiro. Por favor, escolha outro horário.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }
      
      console.log("Dados do agendamento:", {
        client_id: user.id,
        barbershop_id: barberShop.id,
        service_id: selectedService,
        barber_id: selectedBarber || null,
        booking_date: bookingDate,
        booking_time: selectedTime,
        total_price: selectedServiceData.price + selectedProductsTotal,
        notes: notes || null,
        status: 'pending'
      });
      
      // Buscar o nome do cliente do perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          barbershop_id: barberShop.id,
          service_id: selectedService,
          barber_id: selectedBarber || null,
          booking_date: bookingDate,
          booking_time: selectedTime,
          total_price: selectedServiceData.price + selectedProductsTotal,
          notes: notes || null,
          status: 'pending',
          client_name: profileData?.display_name || 'Cliente'
        })
        .select()
        .single();

      if (error) {
        console.error("Erro do Supabase:", error);
        throw error;
      }

      // If products were selected, save them to booking_products
      if (selectedProducts.length > 0 && bookingData) {
        const bookingProducts = selectedProductsData.map(product => ({
          booking_id: bookingData.id,
          product_id: product.id,
          quantity: 1,
          unit_price: product.price
        }));

        const { error: productsError } = await supabase
          .from('booking_products')
          .insert(bookingProducts);

        if (productsError) {
          console.error("Erro ao salvar produtos:", productsError);
          // Don't throw error here, booking was successful
        }
      }

      console.log("Agendamento criado:", bookingData);

      toast({
        title: "Agendamento realizado!",
        description: "Seu agendamento foi criado com sucesso. Você receberá uma confirmação em breve.",
      });

      // Reset form
      setSelectedDate(new Date());
      setSelectedTime("");
      setSelectedService("");
      setSelectedBarber("");
      setSelectedProducts([]);
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
  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
  const selectedProductsTotal = selectedProductsData.reduce((sum, product) => sum + product.price, 0);
  const selectedBarberData = barbers.find(b => b.id === selectedBarber);

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
              {/* Barber Selection */}
              <div className="space-y-3">
                <Label>Escolha o profissional (opcional)</Label>
                {barbers.length > 0 ? (
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um barbeiro" />
                    </SelectTrigger>
                    <SelectContent>
                       {barbers.map((barber) => (
                         <SelectItem key={barber.id} value={barber.id}>
                           <div className="flex items-center space-x-2">
                             {barber.image_url ? (
                               <img
                                 src={barber.image_url}
                                 alt={barber.name}
                                 className="w-6 h-6 rounded-full object-cover"
                               />
                             ) : (
                               <User className="h-4 w-4" />
                             )}
                             <div>
                               <div className="font-medium">{barber.name}</div>
                               {barber.specialty && (
                                 <div className="text-xs text-muted-foreground">{barber.specialty}</div>
                               )}
                             </div>
                           </div>
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                    Nenhum barbeiro cadastrado. Você será atendido pelo profissional disponível.
                  </p>
                )}
              </div>

              {/* Products Selection */}
              <div className="space-y-3">
                <Label>Produtos (opcional)</Label>
                {products.length > 0 ? (
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
                              {product.description && (
                                <p className="text-xs text-muted-foreground">{product.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Estoque: {product.stock_quantity} unidades
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-primary">R$ {product.price.toFixed(2)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                    Nenhum produto disponível no momento.
                  </p>
                )}
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
                  {availableTimes.map((time) => {
                    const isBlocked = blockedTimes.includes(time);
                    const isBooked = bookedTimes.includes(time);
                    const isUnavailable = isBlocked || isBooked;
                    
                    return (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => !isUnavailable && setSelectedTime(time)}
                        disabled={isUnavailable}
                        className={isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {time}
                      </Button>
                    );
                  })}
                </div>
                {selectedBarber && (blockedTimes.length > 0 || bookedTimes.length > 0) && (
                  <p className="text-xs text-muted-foreground">
                    Horários bloqueados ou já agendados não estão disponíveis
                  </p>
                )}
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
                        <span className="font-medium">{selectedBarberData?.name || "A definir"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duração:</span>
                        <span className="font-medium">{selectedServiceData?.duration} min</span>
                      </div>
                      {selectedProductsData.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Produtos:</span>
                          {selectedProductsData.map((product) => (
                            <div key={product.id} className="flex justify-between text-xs pl-2">
                              <span>• {product.name}</span>
                              <span>R$ {product.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal Serviço:</span>
                          <span>R$ {selectedServiceData?.price.toFixed(2)}</span>
                        </div>
                        {selectedProductsTotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Subtotal Produtos:</span>
                            <span>R$ {selectedProductsTotal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-primary">R$ {((selectedServiceData?.price || 0) + selectedProductsTotal).toFixed(2)}</span>
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