import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Clock, Heart, Share2, Calendar } from "lucide-react";

interface BarberShop {
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
}

interface BarberShopCardProps {
  barberShop: BarberShop;
}

export const BarberShopCard = ({ barberShop }: BarberShopCardProps) => {
  return (
    <Card className="group hover:shadow-elegant transition-all duration-300 bg-gradient-card border-border overflow-hidden">
      <div className="relative">
        {/* Image */}
        <div className="aspect-[16/10] bg-muted relative overflow-hidden">
          <img 
            src={barberShop.image} 
            alt={barberShop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Overlay Actions */}
          <div className="absolute top-3 right-3 flex space-x-2">
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge 
              className={
                barberShop.isOpen 
                  ? "bg-success text-success-foreground" 
                  : "bg-destructive text-destructive-foreground"
              }
            >
              {barberShop.isOpen ? "Aberto" : "Fechado"}
            </Badge>
          </div>

          {/* Promotions */}
          {barberShop.promotions.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3">
              <Badge className="bg-primary text-primary-foreground text-xs">
                {barberShop.promotions[0]}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
            {barberShop.name}
          </h3>
          <span className="text-sm text-muted-foreground font-medium">
            {barberShop.priceRange}
          </span>
        </div>

        {/* Rating and Distance */}
        <div className="flex items-center space-x-4 mb-3">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-primary fill-current" />
            <span className="text-sm font-medium text-foreground">
              {barberShop.rating}
            </span>
            <span className="text-sm text-muted-foreground">
              ({barberShop.reviewCount})
            </span>
          </div>
          
          <div className="flex items-center space-x-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{barberShop.distance}</span>
          </div>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1 mb-4">
          {barberShop.specialties.slice(0, 3).map((specialty, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="text-xs border-border text-muted-foreground"
            >
              {specialty}
            </Badge>
          ))}
        </div>

        {/* Next Available */}
        <div className="flex items-center space-x-1 mb-4 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Próximo horário:</span>
          <span className="text-foreground font-medium">{barberShop.nextAvailable}</span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button 
            className="flex-1"
            variant="gradient"
            size="sm"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Agendar
          </Button>
          <Button variant="elegant" size="sm">
            Ver Perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};