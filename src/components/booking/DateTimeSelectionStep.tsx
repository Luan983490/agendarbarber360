import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { format, addDays, isSameDay, startOfToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAvailableSlots, bookingKeys } from "@/hooks/useBooking";
import { useQueryClient } from "@tanstack/react-query";

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

interface SelectedServiceItem {
  service: Service;
  barber?: Barber;
  time?: string;
}

interface DateTimeSelectionStepProps {
  barbershopId: string;
  selectedServices: SelectedServiceItem[];
  currentServiceIndex: number;
  barbers: Barber[];
  selectedDate: Date;
  selectedTime: string;
  selectedBarber: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  onBarberChange: (barberId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onAddService: () => void;
  loading: boolean;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

type TimePeriod = "Manhã" | "Tarde" | "Noite";

const PERIOD_RANGES: Record<TimePeriod, { start: number; end: number }> = {
  "Manhã": { start: 6, end: 12 },
  "Tarde": { start: 12, end: 18 },
  "Noite": { start: 18, end: 24 },
};

export const DateTimeSelectionStep = ({
  barbershopId,
  selectedServices,
  currentServiceIndex,
  barbers,
  selectedDate,
  selectedTime,
  selectedBarber,
  onDateChange,
  onTimeChange,
  onBarberChange,
  onBack,
  onContinue,
  onAddService,
  loading,
  notes = "",
  onNotesChange,
}: DateTimeSelectionStepProps) => {
  const today = startOfToday();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("Manhã");
  const [dateScrollOffset, setDateScrollOffset] = useState(0);
  const dateContainerRef = useRef<HTMLDivElement>(null);
  const timeContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [mobileVisibleMonth, setMobileVisibleMonth] = useState<Date | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentService = selectedServices[currentServiceIndex];
  const selectedBarberData = barbers.find((b) => b.id === selectedBarber);
  const serviceDuration = currentService?.service.duration || 30;

  // Format date as YYYY-MM-DD (strict format for PostgreSQL)
  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  
  // DEBUG: Log component state
  console.log('🎨 DateTimeSelectionStep: Estado do componente', {
    barbershopId,
    selectedBarber,
    selectedDate: selectedDate?.toISOString(),
    formattedDate,
    formattedDateValid: /^\d{4}-\d{2}-\d{2}$/.test(formattedDate),
    serviceDuration,
    currentServiceName: currentService?.service.name,
    barbersCount: barbers.length,
    selectedPeriod
  });

  // Fetch available slots using the hook
  const { data: availableSlots, isLoading: slotsLoading, error: slotsError, isError, refetch, isFetching } = useAvailableSlots(
    selectedBarber
      ? {
          barbershopId,
          barberId: selectedBarber,
          date: formattedDate,
          serviceDuration,
        }
      : null
  );

  // Force refetch when date or barber changes
  useEffect(() => {
    if (selectedBarber && formattedDate) {
      console.log('🔄 DateTimeSelectionStep: Invalidando cache para nova data/barbeiro', {
        barberId: selectedBarber,
        date: formattedDate
      });
      // Invalidate all available slots cache and refetch
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
    }
  }, [selectedBarber, formattedDate, queryClient]);

  // Manual refresh handler
  const handleRefreshSlots = useCallback(() => {
    console.log('🔃 DateTimeSelectionStep: Refresh manual solicitado');
    queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
    refetch();
  }, [queryClient, refetch]);

  // DEBUG: Log slots data
  console.log('📊 DateTimeSelectionStep: Dados dos slots', {
    slotsLoading,
    isError,
    slotsError: slotsError?.message,
    availableSlotsRaw: availableSlots,
    availableSlotsCount: availableSlots?.length || 0,
    availableSlotsType: typeof availableSlots,
    isArray: Array.isArray(availableSlots)
  });

  // Generate 365 days from today (full year)
  const allDates = Array.from({ length: 365 }, (_, i) => addDays(today, i));
  const visibleDatesCount = windowWidth < 480 ? 5 : windowWidth < 768 ? 7 : windowWidth < 1024 ? 10 : 14;
  const isCompact = windowWidth < 768;
  const visibleDates = isCompact ? allDates : allDates.slice(dateScrollOffset, dateScrollOffset + visibleDatesCount);

  // Get available times from slots - FILTER by available === true
  const allSlotsFromApi = availableSlots || [];
  const availableOnlySlots = allSlotsFromApi.filter((slot) => slot.available === true);
  const availableTimes = availableOnlySlots.map((slot) => slot.time);
  
  console.log('🔍 Antes do filtro:', allSlotsFromApi.length, 'Depois do filtro:', availableOnlySlots.length);
  console.log('⏰ DateTimeSelectionStep: Horários DISPONÍVEIS extraídos', {
    totalFromApi: allSlotsFromApi.length,
    availableCount: availableOnlySlots.length,
    unavailableCount: allSlotsFromApi.length - availableOnlySlots.length,
    availableTimesFirst5: availableTimes.slice(0, 5),
    unavailableSlots: allSlotsFromApi.filter(s => !s.available).map(s => s.time).slice(0, 10)
  });

  // Filter times by period - DEBUG version
  const filteredTimes = availableTimes.filter((time) => {
    const hour = parseInt(time.split(":")[0]);
    const range = PERIOD_RANGES[selectedPeriod];
    const passes = hour >= range.start && hour < range.end;
    return passes;
  });

  console.log('🔍 DateTimeSelectionStep: FILTRO DE PERÍODO', {
    selectedPeriod,
    periodRange: PERIOD_RANGES[selectedPeriod],
    beforeFilter: availableTimes.length,
    afterFilter: filteredTimes.length,
    filteredTimes: filteredTimes.slice(0, 10),
    hoursInData: availableTimes.slice(0, 10).map(t => parseInt(t.split(":")[0]))
  });

  // Auto-select period based on available times
  useEffect(() => {
    if (availableTimes.length > 0 && selectedBarber) {
      const firstTime = availableTimes[0];
      const hour = parseInt(firstTime.split(":")[0]);
      console.log('🔄 DateTimeSelectionStep: Auto-selecionando período', {
        firstTime,
        hour,
        newPeriod: hour < 12 ? "Manhã" : hour < 18 ? "Tarde" : "Noite"
      });
      if (hour < 12) {
        setSelectedPeriod("Manhã");
      } else if (hour < 18) {
        setSelectedPeriod("Tarde");
      } else {
        setSelectedPeriod("Noite");
      }
    }
  }, [availableTimes.length, selectedBarber]);

  // Reset time when barber changes
  useEffect(() => {
    onTimeChange("");
  }, [selectedBarber]);

  // Calculate end time
  const getEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  // Calculate total
  const totalPrice = selectedServices.reduce((sum, item) => sum + item.service.price, 0);
  const totalDuration = selectedServices.reduce((sum, item) => sum + item.service.duration, 0);

  // Track visible month on mobile scroll
  useEffect(() => {
    if (!isCompact || !dateContainerRef.current) return;
    const container = dateContainerRef.current;
    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      const buttons = container.children;
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i] as HTMLElement;
        const btnRect = btn.getBoundingClientRect();
        if (btnRect.left <= centerX && btnRect.right >= centerX) {
          if (i < allDates.length) {
            setMobileVisibleMonth(allDates[i]);
          }
          break;
        }
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isCompact, allDates]);

  // Month title
  const getMonthYearTitle = () => {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    if (isCompact) {
      const refDate = mobileVisibleMonth || selectedDate;
      return `${capitalize(format(refDate, "MMMM", { locale: ptBR }))} ${format(refDate, "yyyy")}`;
    }
    const firstVisible = visibleDates[0];
    const lastVisible = visibleDates[visibleDates.length - 1];
    
    if (!firstVisible || !lastVisible) return "";
    
    const firstMonth = format(firstVisible, "MMMM", { locale: ptBR });
    const lastMonth = format(lastVisible, "MMMM", { locale: ptBR });
    const firstYear = format(firstVisible, "yyyy");
    const lastYear = format(lastVisible, "yyyy");

    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `${capitalize(firstMonth)} ${firstYear}`;
    }
    if (firstYear === lastYear) {
      return `${capitalize(firstMonth)} - ${capitalize(lastMonth)} ${firstYear}`;
    }
    return `${capitalize(firstMonth)} ${firstYear} - ${capitalize(lastMonth)} ${lastYear}`;
  };

  const handleDateScroll = (direction: "left" | "right") => {
    const scrollStep = visibleDatesCount;
    if (direction === "left" && dateScrollOffset > 0) {
      setDateScrollOffset((prev) => Math.max(0, prev - scrollStep));
    } else if (direction === "right" && dateScrollOffset < allDates.length - visibleDatesCount) {
      setDateScrollOffset((prev) => Math.min(allDates.length - visibleDatesCount, prev + scrollStep));
    }
  };

  // Touch swipe removed — mobile now uses native overflow-x scroll for smooth carousel feel

  // Scroll selected date into view on mobile
  useEffect(() => {
    if (isCompact && dateContainerRef.current) {
      const selectedIndex = allDates.findIndex(d => isSameDay(d, selectedDate));
      if (selectedIndex >= 0) {
        const container = dateContainerRef.current;
        const buttons = container.children;
        if (buttons[selectedIndex]) {
          const btn = buttons[selectedIndex] as HTMLElement;
          const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
          container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
      }
    }
  }, [isCompact, selectedDate]);
  // Check if date has any availability (for visual indicator)
  const getDateAvailability = (date: Date): "available" | "limited" | "unavailable" => {
    // Sunday is always unavailable by default
    if (date.getDay() === 0) return "unavailable";
    return "available"; // Will be refined with real data
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-y-auto">
      {/* Dark header bar */}
      <div className="w-full bg-background">
        {/* Title bar */}
        <div className="flex items-center px-3 pt-4 pb-2">
          <button onClick={onBack} className="p-2 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-foreground font-bold text-sm tracking-widest uppercase">
            Agendar Horário
          </h1>
          <div className="w-9" />
        </div>

        {/* Month/Year pill */}
        <div className="flex items-center justify-center px-3 pb-3">
          <div className="inline-flex items-center gap-3 border-b border-t border-foreground/25 px-5 py-1.5">
            <button
              onClick={() => {
                if (isCompact && dateContainerRef.current) {
                  const refDate = mobileVisibleMonth || selectedDate;
                  const prevMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
                  const idx = allDates.findIndex(d => d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear());
                  if (idx >= 0) {
                    const btn = dateContainerRef.current.children[idx] as HTMLElement;
                    dateContainerRef.current.scrollTo({ left: btn.offsetLeft, behavior: 'smooth' });
                  }
                } else {
                  setDateScrollOffset(Math.max(0, dateScrollOffset - 30));
                }
              }}
              className="hover:bg-foreground/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-foreground/70" />
            </button>
            <span className="text-foreground text-xs font-medium tracking-wide min-w-[110px] text-center">
              {getMonthYearTitle()}
            </span>
            <button
              onClick={() => {
                if (isCompact && dateContainerRef.current) {
                  const refDate = mobileVisibleMonth || selectedDate;
                  const nextMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
                  const idx = allDates.findIndex(d => d.getMonth() === nextMonth.getMonth() && d.getFullYear() === nextMonth.getFullYear());
                  if (idx >= 0) {
                    const btn = dateContainerRef.current.children[idx] as HTMLElement;
                    dateContainerRef.current.scrollTo({ left: btn.offsetLeft, behavior: 'smooth' });
                  }
                } else {
                  setDateScrollOffset(Math.min(allDates.length - visibleDatesCount, dateScrollOffset + 30));
                }
              }}
              className="hover:bg-foreground/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-foreground/70" />
            </button>
          </div>
        </div>

        {/* Date strip - 7 days visible like image */}
        <div className="flex items-center px-3 pb-4">
          {!isCompact && (
            <button
              onClick={() => handleDateScroll("left")}
              disabled={dateScrollOffset === 0}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0",
                dateScrollOffset === 0 ? "opacity-30 pointer-events-none" : "hover:bg-foreground/10"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          )}

          <div
            ref={dateContainerRef}
            className={cn(
              "flex-1 flex justify-between py-1",
              isCompact && "overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide gap-0"
            )}
            style={isCompact ? { scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } : undefined}
          >
            {visibleDates.map((date) => {
              const isPast = isBefore(startOfDay(date), startOfDay(today));
              const isSunday = date.getDay() === 0;
              const isSelected = isSameDay(date, selectedDate);
              const isDisabled = isPast || isSunday;

              const dayAbbr = format(date, "EEE", { locale: ptBR })
                .replace(".", "")
                .substring(0, 3)
                .toUpperCase();

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && onDateChange(date)}
                  disabled={isDisabled}
                  className={cn(
                    "flex flex-col items-center justify-center transition-all",
                    isCompact ? "min-w-[44px] flex-shrink-0 snap-start py-1" : "flex-1 py-1",
                    isDisabled && "opacity-30 pointer-events-none"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-bold tracking-wider mb-1.5",
                    isSelected ? "text-foreground" : "text-foreground/40"
                  )}>
                    {dayAbbr}
                  </span>
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all",
                    isSelected
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-foreground/10"
                  )}>
                    {format(date, "d")}
                  </div>
                </button>
              );
            })}
          </div>

          {!isCompact && (
            <button
              onClick={() => handleDateScroll("right")}
              disabled={dateScrollOffset >= allDates.length - visibleDatesCount}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0",
                dateScrollOffset >= allDates.length - visibleDatesCount ? "opacity-30 pointer-events-none" : "hover:bg-foreground/10"
              )}
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* White content area - all scrollable including button */}
      <div className="bg-background">
        {/* Choose Professional - white card like reference */}
        <div className="w-full bg-card py-5 px-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest text-center mb-5">Escolha o Profissional</h3>
          <div className="flex justify-center gap-6 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {barbers.map((barber) => {
              const isSelected = selectedBarber === barber.id;
              return (
                <button
                  key={barber.id}
                  onClick={() => onBarberChange(barber.id)}
                  className="flex flex-col items-center gap-2 min-w-[76px] flex-shrink-0 group"
                >
                  {/* Dark circle background when selected */}
                  <div className={cn(
                    "w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all",
                    isSelected ? "bg-foreground" : "bg-transparent"
                  )}>
                    <div className={cn(
                      "w-[62px] h-[62px] rounded-full overflow-hidden border-2 transition-all",
                      isSelected
                        ? "border-background"
                        : "border-border group-hover:border-foreground/40"
                    )}>
                      {barber.image_url ? (
                        <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <User className="w-7 h-7 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] text-center line-clamp-1 max-w-[80px] leading-tight uppercase tracking-wide",
                    isSelected
                      ? "font-bold bg-foreground text-background px-3 py-0.5 rounded-sm"
                      : "font-medium text-muted-foreground"
                  )}>
                    {barber.name}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Pagination dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  selectedBarber === barber.id ? "bg-foreground" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>

        {/* Available Slots - after professional */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-foreground uppercase tracking-wide">Horários Disponíveis</h3>
            {selectedBarber && (
              <button
                onClick={handleRefreshSlots}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Atualizar horários"
              >
                <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isFetching && "animate-spin")} />
              </button>
            )}
          </div>

          {!selectedBarber ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
              <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Escolha um profissional para ver os horários disponíveis
              </p>
            </div>
          ) : (
            <>
              {/* Period selector pills */}
              <div className="flex gap-2 mb-4">
                {(["Manhã", "Tarde", "Noite"] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                      selectedPeriod === period
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* Time slots grid - 3 columns like image */}
              <div className="grid grid-cols-3 gap-2.5">
                {(slotsLoading || isFetching) ? (
                  <div className="col-span-3 flex items-center justify-center gap-2 text-muted-foreground py-6">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">Carregando horários...</span>
                  </div>
                ) : isError ? (
                  <div className="col-span-3 flex flex-col items-center gap-2 text-destructive py-4">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Erro ao carregar horários.</span>
                    <button
                      onClick={handleRefreshSlots}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Tentar novamente
                    </button>
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center gap-2 text-muted-foreground py-4">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Nenhum horário disponível</span>
                    <button
                      onClick={handleRefreshSlots}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Atualizar
                    </button>
                  </div>
                ) : filteredTimes.length === 0 ? (
                  <div className="col-span-3 flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                    <span>Nenhum horário no período "{selectedPeriod}"</span>
                  </div>
                ) : (
                  filteredTimes.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => onTimeChange(time)}
                        className={cn(
                          "py-2.5 rounded-full text-sm font-semibold transition-all border",
                          isSelected
                            ? "bg-foreground text-background border-foreground"
                            : "bg-transparent text-foreground border-border hover:border-foreground"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Service summary card */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-xl border border-border">
            <div className="flex items-start justify-between p-4">
              <h3 className="font-semibold text-foreground text-sm">{currentService?.service.name}</h3>
              <div className="text-right">
                <p className="font-bold text-foreground text-sm">
                  R$ {currentService?.service.price.toFixed(2).replace(".", ",")}
                </p>
                {selectedTime && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedTime} - {getEndTime(selectedTime, currentService?.service.duration || 0)}
                  </p>
                )}
              </div>
            </div>
            {selectedBarberData && (
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Profissional:</span>
                  <div className="flex items-center gap-2">
                    {selectedBarberData.image_url ? (
                      <img src={selectedBarberData.image_url} alt={selectedBarberData.name} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-foreground">{selectedBarberData.name}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onAddService}
            className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            + Adicionar outro serviço
          </button>
        </div>

        {/* Observations */}
        <div className="px-4 pb-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder="Ex: Quero o corte mais curto nas laterais..."
            maxLength={500}
            className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            rows={3}
          />
          <span className="text-xs text-muted-foreground mt-1 block text-right">
            {notes.length}/500
          </span>
        </div>

        {/* Footer - inside scroll, not fixed */}
        <div className="border-t border-border px-4 pt-3 pb-12">
          <div className="flex items-center justify-end gap-3 mb-3">
            <span className="text-muted-foreground text-sm">Total:</span>
            <span className="text-xl font-bold text-foreground">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatDuration(totalDuration)}
            </span>
          </div>
          <Button
            onClick={onContinue}
            disabled={!selectedTime || !selectedBarber || loading}
            className="w-full h-12 font-bold text-base rounded-xl uppercase tracking-wide"
          >
            {loading ? "Agendando..." : "Agendar"}
          </Button>
        </div>
        {/* Spacer to ensure button is never cut off on mobile */}
        <div className="h-16 flex-shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
};
