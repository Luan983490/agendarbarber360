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
}: DateTimeSelectionStepProps) => {
  const today = startOfToday();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("Manhã");
  const [dateScrollOffset, setDateScrollOffset] = useState(0);
  const dateContainerRef = useRef<HTMLDivElement>(null);
  const timeContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

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
  const visibleDatesCount = isMobile ? 7 : 14;
  const visibleDates = allDates.slice(dateScrollOffset, dateScrollOffset + visibleDatesCount);

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

  // Month title
  const getMonthYearTitle = () => {
    const firstVisible = visibleDates[0];
    const lastVisible = visibleDates[visibleDates.length - 1];
    
    if (!firstVisible || !lastVisible) return "";
    
    const firstMonth = format(firstVisible, "MMMM", { locale: ptBR });
    const lastMonth = format(lastVisible, "MMMM", { locale: ptBR });
    const firstYear = format(firstVisible, "yyyy");
    const lastYear = format(lastVisible, "yyyy");

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `${capitalize(firstMonth)} ${firstYear}`;
    }
    if (firstYear === lastYear) {
      return `${capitalize(firstMonth)} - ${capitalize(lastMonth)} ${firstYear}`;
    }
    return `${capitalize(firstMonth)} ${firstYear} - ${capitalize(lastMonth)} ${lastYear}`;
  };

  const handleDateScroll = (direction: "left" | "right") => {
    const scrollStep = isMobile ? 7 : 7;
    if (direction === "left" && dateScrollOffset > 0) {
      setDateScrollOffset((prev) => Math.max(0, prev - scrollStep));
    } else if (direction === "right" && dateScrollOffset < allDates.length - visibleDatesCount) {
      setDateScrollOffset((prev) => Math.min(allDates.length - visibleDatesCount, prev + scrollStep));
    }
  };

  // Check if date has any availability (for visual indicator)
  const getDateAvailability = (date: Date): "available" | "limited" | "unavailable" => {
    // Sunday is always unavailable by default
    if (date.getDay() === 0) return "unavailable";
    return "available"; // Will be refined with real data
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-y-auto">
      {/* Header with back arrow and month/year */}
      <div className="w-full py-4">
        <div className="flex items-center px-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-xl md:text-2xl font-bold text-foreground italic">
            {getMonthYearTitle()}
          </h2>
          <div className="w-10" />
        </div>
      </div>

      {/* Horizontal date picker - full width with circular arrows */}
      <div className="w-full flex items-center gap-1">
        {/* Left arrow in circle - always visible */}
        <button
          onClick={() => handleDateScroll("left")}
          disabled={dateScrollOffset === 0}
          className={cn(
            "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border bg-background transition-colors flex-shrink-0",
            dateScrollOffset === 0 ? "opacity-30 pointer-events-none" : "hover:bg-muted"
          )}
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        </button>

        <div 
          ref={dateContainerRef}
          className={cn(
            "flex-1 flex gap-2 py-2",
            isMobile ? "overflow-x-auto scrollbar-hide" : "justify-center"
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {visibleDates.map((date, index) => {
            const isPast = isBefore(startOfDay(date), startOfDay(today));
            const isSunday = date.getDay() === 0;
            const isSelected = isSameDay(date, selectedDate);
            const isDisabled = isPast || isSunday;
            const availability = getDateAvailability(date);

            const dayAbbr = format(date, "EEE", { locale: ptBR })
              .replace(".", "")
              .charAt(0).toUpperCase() + format(date, "EEE", { locale: ptBR }).replace(".", "").slice(1);

            return (
              <button
                key={date.toISOString()}
                onClick={() => !isDisabled && onDateChange(date)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center py-3 rounded-xl transition-all",
                  isMobile
                    ? "px-3 min-w-[48px] flex-shrink-0"
                    : "px-2 flex-1 max-w-[72px]",
                  isSelected
                    ? "bg-[#3d9a9b] text-white"
                    : "bg-card border border-border hover:bg-muted text-foreground",
                  isDisabled && "opacity-40 pointer-events-none"
                )}
              >
                <span className="text-xs font-medium capitalize">
                  {dayAbbr}
                </span>
                <span className="text-lg md:text-xl font-bold mt-1">
                  {format(date, "d")}
                </span>
                {!isDisabled && (
                  <div
                    className="w-5 h-1.5 rounded-full mt-1.5"
                    style={{ 
                      backgroundColor: isSelected 
                        ? "white" 
                        : availability === "available" 
                          ? "#22c55e" 
                          : availability === "limited" 
                            ? "#eab308" 
                            : "#ef4444"
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right arrow in circle - always visible */}
        <button
          onClick={() => handleDateScroll("right")}
          disabled={dateScrollOffset >= allDates.length - visibleDatesCount}
          className={cn(
            "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border bg-background transition-colors flex-shrink-0",
            dateScrollOffset >= allDates.length - visibleDatesCount ? "opacity-30 pointer-events-none" : "hover:bg-muted"
          )}
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Barber selection - visible cards with photo and name */}
      <div className="w-full mt-6 px-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Escolha o profissional</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {barbers.map((barber) => (
            <button
              key={barber.id}
              onClick={() => onBarberChange(barber.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl transition-all min-w-[80px] flex-shrink-0 border",
                selectedBarber === barber.id
                  ? "bg-[#3d9a9b] text-white border-[#3d9a9b]"
                  : "bg-card border-border hover:border-foreground"
              )}
            >
              {barber.image_url ? (
                <img
                  src={barber.image_url}
                  alt={barber.name}
                  className="w-12 h-12 rounded-full object-cover mb-2"
                />
              ) : (
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                  selectedBarber === barber.id ? "bg-white/20" : "bg-muted"
                )}>
                  <User className={cn(
                    "w-6 h-6",
                    selectedBarber === barber.id ? "text-white" : "text-muted-foreground"
                  )} />
                </div>
              )}
              <span className={cn(
                "text-xs font-medium text-center line-clamp-2",
                selectedBarber === barber.id ? "text-white" : "text-foreground"
              )}>
                {barber.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: Show message if no barber selected, or show time slots */}
      {!selectedBarber ? (
        <div className="w-full mt-8 px-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Escolha um profissional para ver os horários disponíveis
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Period selector - pill style */}
          <div className="w-full flex justify-center mt-6">
            <div className="inline-flex rounded-full border border-border overflow-hidden bg-card">
              {(["Manhã", "Tarde", "Noite"] as TimePeriod[]).map((period, idx) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    "px-6 md:px-10 py-3 text-sm md:text-base font-medium transition-colors",
                    selectedPeriod === period
                      ? "bg-background text-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground",
                    idx !== 0 && "border-l border-border"
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Time slots - horizontal scroll with circular arrows */}
          <div className="w-full mt-6 flex items-center gap-1">
            {/* Left arrow in circle */}
            <button
              onClick={() => {
                if (timeContainerRef.current) {
                  timeContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
                }
              }}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>

            <div
              ref={timeContainerRef}
              className="flex-1 flex gap-3 overflow-x-auto py-2 scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {(slotsLoading || isFetching) ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Carregando horários...</span>
                </div>
              ) : isError ? (
                <div className="flex items-center gap-3 text-destructive py-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Erro ao carregar horários.</span>
                  <button
                    onClick={handleRefreshSlots}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Tentar novamente
                  </button>
                </div>
              ) : availableTimes.length === 0 ? (
                <div className="flex items-center gap-3 text-muted-foreground py-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Nenhum horário disponível para esta data</span>
                  <button
                    onClick={handleRefreshSlots}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Atualizar
                  </button>
                </div>
              ) : filteredTimes.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <span>Nenhum horário no período "{selectedPeriod}"</span>
                  <span className="text-xs">({availableTimes.length} em outros períodos)</span>
                </div>
              ) : (
                filteredTimes.map((time) => {
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      onClick={() => onTimeChange(time)}
                      className={cn(
                        "px-5 md:px-6 py-3 rounded-lg text-sm md:text-base font-medium transition-all flex-shrink-0 border",
                        isSelected
                          ? "bg-[#3d9a9b] text-white border-[#3d9a9b]"
                          : "bg-card text-foreground border-border hover:border-foreground"
                      )}
                    >
                      {time}
                    </button>
                  );
                })
              )}
            </div>

            {/* Right arrow in circle */}
            <button
              onClick={() => {
                if (timeContainerRef.current) {
                  timeContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
                }
              }}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>
          </div>
        </>
      )}

      {/* Service summary card */}
      <div className="flex-1 mt-6 px-3">
        <div className="w-full">
          <div className="bg-card rounded-xl border border-border">
            {/* Service header */}
            <div className="flex items-start justify-between p-4 md:p-5">
              <h3 className="font-semibold text-foreground text-base md:text-lg">
                {currentService?.service.name}
              </h3>
              <div className="text-right">
                <p className="font-bold text-foreground text-base md:text-lg">
                  R$ {currentService?.service.price.toFixed(2).replace(".", ",")}
                </p>
                {selectedTime && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedTime} - {getEndTime(selectedTime, currentService?.service.duration || 0)}
                  </p>
                )}
              </div>
            </div>

            {/* Selected barber display */}
            {selectedBarberData && (
              <div className="border-t border-border px-4 md:px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Profissional:</span>
                  <div className="flex items-center gap-2">
                    {selectedBarberData.image_url ? (
                      <img
                        src={selectedBarberData.image_url}
                        alt={selectedBarberData.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {selectedBarberData.name}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add another service link */}
          <button
            onClick={onAddService}
            className="mt-5 text-[#3d9a9b] hover:text-[#2d8a8b] font-medium text-sm md:text-base flex items-center gap-1"
          >
            + Adicionar outro serviço
          </button>
        </div>
      </div>

      {/* Footer with total and continue button */}
      <div className="border-t border-border bg-background mt-auto flex-shrink-0">
        <div className="w-full px-3 py-4 md:py-5">
          <div className="flex items-center justify-end gap-4 mb-4">
            <span className="text-muted-foreground">Total :</span>
            <span className="text-2xl md:text-3xl font-bold text-foreground">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-muted-foreground text-sm">
              {formatDuration(totalDuration)}
            </span>
          </div>
          <Button
            onClick={onContinue}
            disabled={!selectedTime || !selectedBarber || loading}
            className="w-full h-12 md:h-14 bg-[#3d9a9b] hover:bg-[#2d8a8b] text-white font-semibold text-base md:text-lg rounded-xl"
          >
            {loading ? "Agendando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
};
