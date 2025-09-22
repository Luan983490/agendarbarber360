import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Clock, Phone, Share2, Heart, Calendar, Scissors, DollarSign, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BarberShopProfileProps {
  children: React.ReactNode;
  barberShop: {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
    distance: string;
    isOpen: boolean;
    priceRange: string;
    specialties: string[];
    nextAvailable: string;
    promotions: string[];
  };
}

interface RealBarbershop {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  image_url: string;
  rating: number;
  total_reviews: number;
  opening_hours: any;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface Barber {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  image_url: string;
}

export const BarberShopProfile = ({ children, barberShop }: BarberShopProfileProps) => {
  const [realBarbershop, setRealBarbershop] = useState<RealBarbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBarbershopData = async () => {
    if (!barberShop.id) return;
    
    setLoading(true);
    try {
      // Buscar dados reais da barbearia
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barberShop.id)
        .single();

      if (barbershopData) {
        setRealBarbershop(barbershopData);
      }

      // Buscar serviços
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barberShop.id)
        .eq('is_active', true);

      if (servicesData) {
        setServices(servicesData);
      }

      // Buscar barbeiros
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barberShop.id)
        .eq('is_active', true);

      if (barbersData) {
        setBarbers(barbersData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da barbearia:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbershopData();
  }, [barberShop.id]);

  const reviews = [
    { name: "João Silva", rating: 5, comment: "Excelente atendimento! Profissionais muito qualificados.", date: "2 dias atrás" },
    { name: "Maria Santos", rating: 4, comment: "Ambiente limpo e organizado. Recomendo!", date: "1 semana atrás" },
    { name: "Pedro Costa", rating: 5, comment: "Melhor barbearia da região. Sempre saio satisfeito.", date: "2 semanas atrás" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{barberShop.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <img 
              src={realBarbershop?.image_url || barberShop.image} 
              alt={realBarbershop?.name || barberShop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button variant="secondary" size="icon" className="bg-background/80">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="bg-background/80">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute top-4 left-4">
              <Badge className={barberShop.isOpen ? "bg-success" : "bg-destructive"}>
                {barberShop.isOpen ? "Aberto" : "Fechado"}
              </Badge>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Star className="h-5 w-5 text-primary fill-current" />
                <span className="font-medium">{barberShop.rating}</span>
                <span className="text-muted-foreground">({barberShop.reviewCount} avaliações)</span>
              </div>
              <div className="flex items-center space-x-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{barberShop.distance}</span>
              </div>
            </div>
            <span className="font-medium text-primary">{barberShop.priceRange}</span>
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-2">
            {barberShop.specialties.map((specialty, index) => (
              <Badge key={index} variant="outline">
                {specialty}
              </Badge>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="services">Serviços</TabsTrigger>
              <TabsTrigger value="barbers">Barbeiros</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="services" className="space-y-4">
              {loading ? (
                <p className="text-center text-muted-foreground">Carregando serviços...</p>
              ) : services.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum serviço disponível</p>
              ) : (
                services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Scissors className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-muted-foreground">{service.duration} min</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-primary">R$ {service.price.toFixed(2)}</span>
                        <Button size="sm" variant="gradient">
                          <Calendar className="mr-2 h-4 w-4" />
                          Agendar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="barbers" className="space-y-4">
              {loading ? (
                <p className="text-center text-muted-foreground">Carregando barbeiros...</p>
              ) : barbers.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum barbeiro cadastrado</p>
              ) : (
                barbers.map((barber) => (
                  <Card key={barber.id}>
                    <CardContent className="p-4 flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={barber.image_url} alt={barber.name} />
                        <AvatarFallback>
                          <User className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{barber.name}</h4>
                        {barber.specialty && (
                          <p className="text-sm text-muted-foreground">{barber.specialty}</p>
                        )}
                        {barber.phone && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{barber.phone}</span>
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar com {barber.name}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="space-y-4">
              {reviews.map((review, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{review.name}</h4>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < review.rating ? 'text-primary fill-current' : 'text-muted-foreground'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{review.date}</span>
                    </div>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  {realBarbershop?.description && (
                    <div>
                      <h4 className="font-medium">Sobre</h4>
                      <p className="text-sm text-muted-foreground mt-1">{realBarbershop.description}</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Horário de Funcionamento</h4>
                      <p className="text-sm text-muted-foreground">Segunda a Sexta: 9h - 18h | Sábado: 9h - 16h</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Contato</h4>
                      <p className="text-sm text-muted-foreground">{realBarbershop?.phone || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Endereço</h4>
                      <p className="text-sm text-muted-foreground">{realBarbershop?.address || 'Não informado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};