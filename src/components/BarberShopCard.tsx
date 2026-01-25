import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Clock, Heart, Share2, Calendar } from "lucide-react";
import { BarberShopProfile } from "./BarberShopProfile";
import { BookingFlow } from "./booking";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites(user?.id);
  const isFav = isFavorited(barberShop.id);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(barberShop.id);
  };

  return (
    <Card className="group hover:shadow-elegant transition-all duration-300 bg-gradient-card border-border overflow-hidden">
      <div className="relative">
        {/* Image - reduced aspect ratio */}
        <div className="aspect-[16/8] bg-muted relative overflow-hidden">
          <img 
            src={barberShop.image} 
            alt={barberShop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Overlay Actions */}
          <div className="absolute top-2 right-2 flex space-x-1.5">
            <Button 
              variant="secondary" 
              size="icon" 
              className={cn(
                "h-7 w-7 bg-background/80 hover:bg-background transition-colors",
                isFav && "bg-red-500/80 hover:bg-red-500"
              )}
              onClick={handleToggleFavorite}
            >
              <Heart className={cn(
                "h-3.5 w-3.5 transition-all",
                isFav && "fill-white text-white"
              )} />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80 hover:bg-background">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <Badge 
              className={cn(
                "text-xs px-2 py-0.5",
                barberShop.isOpen 
                  ? "bg-success text-success-foreground" 
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              {barberShop.isOpen ? "Aberto" : "Fechado"}
            </Badge>
          </div>

          {/* Promotions */}
          {barberShop.promotions.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2">
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {barberShop.promotions[0]}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors line-clamp-1">
            {barberShop.name}
          </h3>
          <span className="text-xs text-muted-foreground font-medium">
            {barberShop.priceRange}
          </span>
        </div>

        {/* Rating and Distance */}
        <div className="flex items-center space-x-3 mb-2">
          <div className="flex items-center space-x-1">
            <Star className="h-3.5 w-3.5 text-primary fill-current" />
            <span className="text-xs font-medium text-foreground">
              {barberShop.rating}
            </span>
            <span className="text-xs text-muted-foreground">
              ({barberShop.reviewCount})
            </span>
          </div>
          
          <div className="flex items-center space-x-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">{barberShop.distance}</span>
          </div>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1 mb-2">
          {barberShop.specialties.slice(0, 3).map((specialty, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="text-xs px-1.5 py-0 border-border text-muted-foreground"
            >
              {specialty}
            </Badge>
          ))}
        </div>

        {/* Next Available */}
        <div className="flex items-center space-x-1 mb-3 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Próximo:</span>
          <span className="text-foreground font-medium">{barberShop.nextAvailable}</span>
        </div>

        {/* Actions */}
        <div className="flex">
          <BookingFlow 
            barbershop={{
              id: barberShop.id,
              name: barberShop.name,
              image: barberShop.image,
              rating: barberShop.rating,
            }}
          >
            <Button 
              className="flex-1 h-8 text-sm"
              variant="gradient"
              size="sm"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Agendar
            </Button>
          </BookingFlow>
        </div>
      </CardContent>
    </Card>
  );
};