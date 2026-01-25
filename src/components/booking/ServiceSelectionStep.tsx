import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ChevronDown, ChevronRight, Star, ArrowLeft, Heart, Share2 } from "lucide-react";
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

  // Fetch barbers and barbershop details when tab changes
  useEffect(() => {
    const fetchData = async () => {
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

      if (activeTab === "info" && !barbershopDetails) {
        try {
          const { data } = await supabase
            .from("barbershops")
            .select("description, phone, email, address, opening_hours")
            .eq("id", barbershop.id)
            .single();
          setBarbershopDetails(data);
        } catch (error) {
          console.error("Error fetching barbershop details:", error);
        }
      }
    };

    fetchData();
  }, [activeTab, barbershop.id, barbers.length, barbershopDetails]);

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
