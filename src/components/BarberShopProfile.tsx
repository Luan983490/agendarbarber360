import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MapPin, Clock, Phone, Share2, Heart, Calendar, Scissors, DollarSign } from "lucide-react";

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

export const BarberShopProfile = ({ children, barberShop }: BarberShopProfileProps) => {
  const services = [
    { name: "Corte Masculino", price: "R$ 25", duration: "30 min" },
    { name: "Barba Completa", price: "R$ 20", duration: "20 min" },
    { name: "Corte + Barba", price: "R$ 40", duration: "45 min" },
    { name: "Tratamento Capilar", price: "R$ 35", duration: "40 min" },
  ];

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
              src={barberShop.image} 
              alt={barberShop.name}
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">Serviços</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="services" className="space-y-4">
              {services.map((service, index) => (
                <Card key={index}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Scissors className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">{service.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-primary">{service.price}</span>
                      <Button size="sm" variant="gradient">
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Horário de Funcionamento</h4>
                      <p className="text-sm text-muted-foreground">Segunda a Sexta: 8h - 18h | Sábado: 8h - 16h</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Contato</h4>
                      <p className="text-sm text-muted-foreground">(11) 99999-9999</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Endereço</h4>
                      <p className="text-sm text-muted-foreground">Rua das Flores, 123 - Centro</p>
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