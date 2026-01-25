import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, ChevronDown, ChevronRight, Star, ArrowLeft, Heart, Share2,
  Wifi, Car, Wind, Tv, Coffee, Beer, CreditCard, Calendar, Accessibility, Baby,
  Music, Cigarette, Dog, Gamepad2, Newspaper, Armchair, Sparkles, Scissors
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BarbersTab } from "./BarbersTab";
import { BarbershopInfoTab } from "./BarbershopInfoTab";
import { ReviewsTab } from "./ReviewsTab";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  phone?: string;
  image_url?: string;
}

interface BarbershopDetails {
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  opening_hours?: any;
  amenities?: string[];
}

interface ServiceSelectionStepProps {
  barbershop: {
    id: string;
    name: string;
    address?: string;
    image?: string;
    rating?: number;
  };
  services: Service[];
  onSelectService: (service: Service) => void;
  onBack: () => void;
}

export const ServiceSelectionStep = ({
  barbershop,
  services,
  onSelectService,
  onBack,
}: ServiceSelectionStepProps) => {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites(user?.id);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("services");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbershopDetails, setBarbershopDetails] = useState<BarbershopDetails | null>(null);
  const [loadingBarbers, setLoadingBarbers] = useState(false);

  const isFav = isFavorited(barbershop.id);

  const handleToggleFavorite = () => {
    toggleFavorite(barbershop.id);
  };

  const handleShare = async () => {
    const shareData = {
      title: barbershop.name,
      text: `Confira ${barbershop.name}!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência.",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  // Map amenity names to icons
  const getAmenityIcon = (amenity: string) => {
    const lowerAmenity = amenity.toLowerCase();
    
    if (lowerAmenity.includes("wifi") || lowerAmenity.includes("wi-fi") || lowerAmenity.includes("internet")) {
      return Wifi;
    }
    if (lowerAmenity.includes("estacionamento") || lowerAmenity.includes("parking") || lowerAmenity.includes("garagem")) {
      return Car;
    }
    if (lowerAmenity.includes("ar") || lowerAmenity.includes("climatiz") || lowerAmenity.includes("air")) {
      return Wind;
    }
    if (lowerAmenity.includes("tv") || lowerAmenity.includes("televisão") || lowerAmenity.includes("television")) {
      return Tv;
    }
    if (lowerAmenity.includes("café") || lowerAmenity.includes("coffee") || lowerAmenity.includes("cafe")) {
      return Coffee;
    }
    if (lowerAmenity.includes("cerveja") || lowerAmenity.includes("beer") || lowerAmenity.includes("bebida") || lowerAmenity.includes("bar")) {
      return Beer;
    }
    if (lowerAmenity.includes("cartão") || lowerAmenity.includes("card") || lowerAmenity.includes("crédito") || lowerAmenity.includes("débito") || lowerAmenity.includes("pix")) {
      return CreditCard;
    }
    if (lowerAmenity.includes("agendamento") || lowerAmenity.includes("online") || lowerAmenity.includes("reserva")) {
      return Calendar;
    }
    if (lowerAmenity.includes("acessib") || lowerAmenity.includes("cadeirante") || lowerAmenity.includes("wheelchair")) {
      return Accessibility;
    }
    if (lowerAmenity.includes("infantil") || lowerAmenity.includes("criança") || lowerAmenity.includes("kids") || lowerAmenity.includes("child")) {
      return Baby;
    }
    if (lowerAmenity.includes("música") || lowerAmenity.includes("music") || lowerAmenity.includes("som")) {
      return Music;
    }
    if (lowerAmenity.includes("fumo") || lowerAmenity.includes("cigarro") || lowerAmenity.includes("smoke")) {
      return Cigarette;
    }
    if (lowerAmenity.includes("pet") || lowerAmenity.includes("cachorro") || lowerAmenity.includes("dog") || lowerAmenity.includes("animal")) {
      return Dog;
    }
    if (lowerAmenity.includes("game") || lowerAmenity.includes("jogo") || lowerAmenity.includes("videogame") || lowerAmenity.includes("playstation") || lowerAmenity.includes("xbox")) {
      return Gamepad2;
    }
    if (lowerAmenity.includes("revista") || lowerAmenity.includes("jornal") || lowerAmenity.includes("magazine")) {
      return Newspaper;
    }
    if (lowerAmenity.includes("sofá") || lowerAmenity.includes("espera") || lowerAmenity.includes("lounge") || lowerAmenity.includes("confort")) {
      return Armchair;
    }
    if (lowerAmenity.includes("premium") || lowerAmenity.includes("vip") || lowerAmenity.includes("luxo")) {
      return Sparkles;
    }
    // Default icon
    return Scissors;
  };

  // Fetch barbershop details (description and amenities) on mount
  useEffect(() => {
    const fetchBarbershopDetails = async () => {
      try {
        const { data } = await supabase
          .from("barbershops")
          .select("description, phone, email, address, opening_hours, amenities")
          .eq("id", barbershop.id)
          .single();
        setBarbershopDetails(data);
      } catch (error) {
        console.error("Error fetching barbershop details:", error);
      }
    };
    
    fetchBarbershopDetails();
  }, [barbershop.id]);

  // Fetch barbers when tab changes
  useEffect(() => {
    const fetchBarbers = async () => {
      if (activeTab === "barbers" && barbers.length === 0) {
        setLoadingBarbers(true);
        try {
          const { data } = await supabase
            .from("barbers")
            .select("id, name, specialty, phone, image_url")
            .eq("barbershop_id", barbershop.id)
            .eq("is_active", true);
          setBarbers(data || []);
        } catch (error) {
          console.error("Error fetching barbers:", error);
        } finally {
          setLoadingBarbers(false);
        }
      }
    };

    fetchBarbers();
  }, [activeTab, barbershop.id, barbers.length]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Back button */}
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Header with barbershop info - max width container for desktop */}
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Logo + Name + Address */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {barbershop.image ? (
                <img
                  src={barbershop.image}
                  alt={barbershop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl md:text-2xl font-bold text-foreground">
                  {barbershop.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Name and address */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                {barbershop.name}
              </h2>
              {barbershop.address && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {barbershop.address}
                </p>
              )}
            </div>
          </div>

          {/* Right: Rating + Actions */}
          <div className="flex items-start gap-3 flex-shrink-0 pt-1">
            {/* Favorite & Share Buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full border border-border bg-card hover:bg-accent transition-colors",
                  isFav && "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                )}
                onClick={handleToggleFavorite}
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-all",
                    isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  )}
                  strokeWidth={1.5}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-border bg-card hover:bg-accent transition-colors"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </Button>
            </div>

            {/* Rating */}
            {barbershop.rating && (
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl md:text-3xl font-bold text-foreground">
                    {barbershop.rating.toFixed(1).replace(".", ",")}
                  </span>
                  <span className="text-sm text-muted-foreground">/5</span>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < Math.floor(barbershop.rating || 0)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg h-auto">
            <TabsTrigger
              value="services"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2 text-sm font-medium"
            >
              Serviços
            </TabsTrigger>
            <TabsTrigger
              value="barbers"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2 text-sm font-medium"
            >
              Barbeiros
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2 text-sm font-medium"
            >
              Informações
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2 text-sm font-medium"
            >
              Avaliações
            </TabsTrigger>
          </TabsList>

          {/* Barbershop Description & Amenities - Right below tabs menu */}
          {(barbershopDetails?.description || (barbershopDetails?.amenities && barbershopDetails.amenities.length > 0)) && (
            <div className="mt-4 space-y-3">
              {/* Description - no title */}
              {barbershopDetails?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {barbershopDetails.description}
                </p>
              )}

              {/* Amenities with icons */}
              {barbershopDetails?.amenities && barbershopDetails.amenities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Comodidades</h3>
                  <TooltipProvider delayDuration={100}>
                    <div className="flex flex-wrap gap-3">
                      {barbershopDetails.amenities.map((amenity, index) => {
                        const IconComponent = getAmenityIcon(amenity);
                        return (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                              >
                                <IconComponent className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>{amenity}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                </div>
              )}
            </div>
          )}

          {/* Services Tab Content */}
          <TabsContent value="services" className="mt-4">
            {/* Search bar */}
            <div className="pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Busca por serviço"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-lg"
                />
              </div>
            </div>

            {/* Collapsible header */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 w-full py-4"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              ) : (
                <ChevronRight className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              )}
              <span className="text-lg md:text-xl font-bold text-foreground">
                Serviços populares
              </span>
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-normal"
              >
                {filteredServices.length} serviços
              </Badge>
            </button>

            {/* Services list */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between py-5 gap-4"
                  >
                    {/* Service name - left aligned, takes available space */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-base md:text-lg">
                        {service.name}
                      </h3>
                    </div>

                    {/* Price + Duration + Button - right aligned */}
                    <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-foreground text-base md:text-lg">
                          R$ {service.price.toFixed(2).replace(".", ",")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(service.duration)}
                        </p>
                      </div>
                      <Button
                        onClick={() => onSelectService(service)}
                        className="bg-[#3d9a9b] hover:bg-[#2d8a8b] text-white font-medium px-5 md:px-6 h-10 rounded-md"
                      >
                        Reservar
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredServices.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum serviço encontrado
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Barbers Tab Content */}
          <TabsContent value="barbers" className="mt-4">
            <BarbersTab barbers={barbers} loading={loadingBarbers} />
          </TabsContent>

          {/* Info Tab Content */}
          <TabsContent value="info" className="mt-4">
            <BarbershopInfoTab
              barbershop={{
                description: barbershopDetails?.description,
                phone: barbershopDetails?.phone,
                email: barbershopDetails?.email,
                address: barbershop.address || barbershopDetails?.address,
                opening_hours: barbershopDetails?.opening_hours,
              }}
            />
          </TabsContent>

          {/* Reviews Tab Content */}
          <TabsContent value="reviews" className="mt-4">
            <ReviewsTab barbershopId={barbershop.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Scrollable area for tab content */}
      <div className="flex-1 overflow-y-auto pb-8" />
    </div>
  );
};
