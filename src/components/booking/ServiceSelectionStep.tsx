import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toSlug } from "@/lib/slug";
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
import { BarbershopDetailsSection } from "./BarbershopDetailsSection";
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
  slug?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  opening_hours?: any;
  amenities?: string[];
  postal_code?: string;
  neighborhood?: string;
  street_number?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  whatsapp?: string;
  instagram_url?: string;
  facebook_url?: string;
  payment_methods?: string[];
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
  prefetchedBarbershopDetails?: BarbershopDetails | null;
  prefetchedWorkingHoursData?: any[] | null;
}

export const ServiceSelectionStep = ({
  barbershop,
  services,
  onSelectService,
  onBack,
  prefetchedBarbershopDetails,
  prefetchedWorkingHoursData,
}: ServiceSelectionStepProps) => {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites(user?.id);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("services");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbershopDetails, setBarbershopDetails] = useState<BarbershopDetails | null>(prefetchedBarbershopDetails || null);
  const [prefetchedWorkingHours, setPrefetchedWorkingHours] = useState<any[] | null>(prefetchedWorkingHoursData ?? null);
  const [loadingDetails, setLoadingDetails] = useState(!prefetchedBarbershopDetails);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [showMobileCta, setShowMobileCta] = useState(true);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  const isFav = isFavorited(barbershop.id);

  // Hide mobile CTA permanently on first scroll
  useEffect(() => {
    if (ctaDismissed) return;
    const container = document.getElementById("service-selection-scroll");
    if (!container) return;
    const onScroll = () => {
      if (container.scrollTop > 50) {
        setShowMobileCta(false);
        setCtaDismissed(true);
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [ctaDismissed]);

  const handleToggleFavorite = () => {
    toggleFavorite(barbershop.id);
  };

  const handleShare = async () => {
    const slug = barbershopDetails?.slug || toSlug(barbershop.name);
    const barbershopUrl = `${window.location.origin}/barbearia/${slug}`;
    const shareData = {
      title: barbershop.name,
      text: `Confira ${barbershop.name}!`,
      url: barbershopUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(barbershopUrl);
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

  // Fetch barbershop details AND working hours fully in parallel on mount (skip if prefetched)
  useEffect(() => {
    if (prefetchedBarbershopDetails) return; // Already have data from parent

    const fetchAllDetails = async () => {
      setLoadingDetails(true);
      try {
        const [detailsResult, hoursResult] = await Promise.all([
          supabase
            .from("barbershops")
            .select("slug, description, phone, email, address, opening_hours, amenities, postal_code, neighborhood, street_number, city, state, latitude, longitude, whatsapp, instagram_url, facebook_url, payment_methods")
            .eq("id", barbershop.id)
            .single(),
          supabase
            .from("barber_working_hours")
            .select("barber_id, day_of_week, is_day_off, period1_start, period1_end, period2_start, period2_end, barbers!inner(barbershop_id, is_active)")
            .eq("barbers.barbershop_id", barbershop.id)
            .eq("barbers.is_active", true)
            .order("day_of_week"),
        ]);

        setBarbershopDetails(detailsResult.data);

        const hours = hoursResult.data || [];
        const dayMap = new Map<number, any>();
        for (const h of hours) {
          const existing = dayMap.get(h.day_of_week);
          if (!existing) {
            dayMap.set(h.day_of_week, { ...h });
          } else {
            if (!h.is_day_off) existing.is_day_off = false;
            if (h.period1_start && (!existing.period1_start || h.period1_start < existing.period1_start)) existing.period1_start = h.period1_start;
            if (h.period1_end && (!existing.period1_end || h.period1_end > existing.period1_end)) existing.period1_end = h.period1_end;
            if (h.period2_start && (!existing.period2_start || h.period2_start < existing.period2_start)) existing.period2_start = h.period2_start;
            if (h.period2_end && (!existing.period2_end || h.period2_end > existing.period2_end)) existing.period2_end = h.period2_end;
          }
        }
        setPrefetchedWorkingHours(Array.from(dayMap.values()).sort((a: any, b: any) => a.day_of_week - b.day_of_week));
      } catch (error) {
        console.error("Error fetching barbershop details:", error);
        setPrefetchedWorkingHours([]);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    fetchAllDetails();
  }, [barbershop.id, prefetchedBarbershopDetails]);

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
    <div id="service-selection-scroll" className="flex flex-col min-h-full bg-background overflow-y-auto">
      {/* Back button */}
      <div className="w-full px-4 md:px-8 lg:px-12 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Main content wrapper - two columns on desktop */}
      <div className="flex flex-col lg:flex-row w-full px-4 md:px-8 lg:px-12 pt-4 gap-8 lg:gap-10">
        {/* Left column: Main content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Header with barbershop info */}
          <div className="pb-4">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Logo + Name + Address + Rating */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Logo */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {barbershop.image ? (
                    <img
                      src={barbershop.image}
                      alt={barbershop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg md:text-xl font-bold text-foreground">
                      {barbershop.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Name, address and rating */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight">
                    {barbershop.name}
                  </h2>
                  {barbershop.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {barbershop.address}
                    </p>
                  )}
                  {/* Rating - smaller, below name */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {barbershop.rating && barbershop.rating > 0 ? (
                      <>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-3 h-3",
                                i < Math.floor(barbershop.rating || 0)
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-muted-foreground"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {barbershop.rating.toFixed(1).replace(".", ",")}
                        </span>
                        <span className="text-xs text-muted-foreground">/5</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">0/5</span>
                        <span className="text-xs text-muted-foreground">· Sem Avaliações</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Book + Favorite & Share Buttons */}
              <div className="flex gap-2 flex-shrink-0 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full border border-border bg-card hover:bg-accent transition-colors",
                    isFav && "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                  )}
                  onClick={handleToggleFavorite}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-all",
                      isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )}
                    strokeWidth={1.5}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-border bg-card hover:bg-accent transition-colors"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </div>

          {/* Barbershop Image Banner */}
          {barbershop.image && (
            <div className="relative w-full max-h-[400px] aspect-square rounded-lg overflow-hidden bg-muted mb-4">
              <img
                src={barbershop.image}
                alt={barbershop.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Scrollable tabs container for mobile */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-4 bg-muted/50 p-1 rounded-lg h-auto gap-1">
                <TabsTrigger
                  value="services"
                  className="flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  Serviços
                </TabsTrigger>
                <TabsTrigger
                  value="barbers"
                  className="flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  Barbeiros
                </TabsTrigger>
                <TabsTrigger
                  value="info"
                  className="flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  Informações
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  Avaliações
                </TabsTrigger>
              </TabsList>
            </div>

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
            <TabsContent value="services" className="mt-4" id="services-list">
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

              {/* Mobile/Tablet: Show details below services */}
              <div className="lg:hidden mt-8">
                <BarbershopDetailsSection
                  barbershopId={barbershop.id}
                  barbershop={{
                    address: barbershopDetails?.address || barbershop.address,
                    street_number: barbershopDetails?.street_number,
                    neighborhood: barbershopDetails?.neighborhood,
                    city: barbershopDetails?.city,
                    state: barbershopDetails?.state,
                    postal_code: barbershopDetails?.postal_code,
                    latitude: barbershopDetails?.latitude,
                    longitude: barbershopDetails?.longitude,
                    phone: barbershopDetails?.phone,
                    whatsapp: barbershopDetails?.whatsapp,
                    opening_hours: barbershopDetails?.opening_hours,
                    payment_methods: barbershopDetails?.payment_methods,
                    instagram_url: barbershopDetails?.instagram_url,
                    facebook_url: barbershopDetails?.facebook_url,
                  }}
                  prefetchedWorkingHours={prefetchedWorkingHours}
                />
              </div>
            </TabsContent>

            {/* Barbers Tab Content */}
            <TabsContent value="barbers" className="mt-4">
              <BarbersTab barbers={barbers} loading={loadingBarbers} />
            </TabsContent>

            {/* Info Tab Content */}
            <TabsContent value="info" className="mt-4">
              <BarbershopInfoTab
                barbershopId={barbershop.id}
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

          {/* Bottom padding for scroll - accounts for mobile bottom nav + CTA */}
          <div className="pb-24 md:pb-8" />
        </div>

        {/* Right column: Sticky sidebar (Desktop only) */}
        <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0">
          <div className="sticky top-4">
            <div className="bg-card border border-border rounded-lg p-5">
              {loadingDetails ? (
                <div className="animate-pulse space-y-5">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-9 w-32 bg-muted rounded mt-3" />
                  </div>
                  <div className="h-px bg-border" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex justify-between">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <BarbershopDetailsSection
                  barbershopId={barbershop.id}
                  compact
                  barbershop={{
                    address: barbershopDetails?.address || barbershop.address,
                    street_number: barbershopDetails?.street_number,
                    neighborhood: barbershopDetails?.neighborhood,
                    city: barbershopDetails?.city,
                    state: barbershopDetails?.state,
                    postal_code: barbershopDetails?.postal_code,
                    latitude: barbershopDetails?.latitude,
                    longitude: barbershopDetails?.longitude,
                    phone: barbershopDetails?.phone,
                    whatsapp: barbershopDetails?.whatsapp,
                    opening_hours: barbershopDetails?.opening_hours,
                    payment_methods: barbershopDetails?.payment_methods,
                    instagram_url: barbershopDetails?.instagram_url,
                    facebook_url: barbershopDetails?.facebook_url,
                  }}
                  prefetchedWorkingHours={prefetchedWorkingHours}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom mobile CTA - hides on scroll down, fully hidden when dismissed */}
      {showMobileCta && (
        <div
          className="fixed bottom-[calc(3rem+env(safe-area-inset-bottom))] left-0 right-0 p-3 bg-background/95 backdrop-blur-sm border-t border-border md:hidden z-[60]"
        >
        <Button
          className="w-full rounded-lg gap-2 text-sm font-semibold h-12"
          onClick={() => {
            setShowMobileCta(false);
            setCtaDismissed(true);
            const servicesSection = document.getElementById("services-list");
            servicesSection?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Calendar className="w-4 h-4" />
          Agendar
        </Button>
        </div>
      )}
    </div>
  );
};
