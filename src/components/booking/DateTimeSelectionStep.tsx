import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  selectedServices: SelectedServiceItem[];
  currentServiceIndex: number;
  availableTimes: string[];
  blockedTimes: string[];
  bookedTimes: string[];
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

export const DateTimeSelectionStep = ({
  selectedServices,
  currentServiceIndex,
  availableTimes,
  blockedTimes,
  bookedTimes,
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("Manhã");

  const currentService = selectedServices[currentServiceIndex];

  // Generate week days
  const weekDays = useMemo(() => {
    const today = new Date();
    const startDate = addDays(today, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [weekOffset]);

  // Get availability indicator color for each day
  const getDayAvailability = (date: Date) => {
    // For demo purposes, return random colors
    // In real app, this would check actual availability
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return null;
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return null; // Sunday closed
    
    const colors = ["bg-primary", "bg-green-500", "bg-yellow-500", "bg-green-500"];
    return colors[dayOfWeek % colors.length];
  };

  // Filter times by period
  const filteredTimes = useMemo(() => {
    return availableTimes.filter((time) => {
      const hour = parseInt(time.split(":")[0]);
      if (selectedPeriod === "Manhã") return hour >= 6 && hour < 12;
      if (selectedPeriod === "Tarde") return hour >= 12 && hour < 18;
      if (selectedPeriod === "Noite") return hour >= 18;
      return true;
    });
  }, [availableTimes, selectedPeriod]);

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

  const selectedBarberData = barbers.find((b) => b.id === selectedBarber);

  const monthYear = format(selectedDate, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

  return (
    <div className="flex flex-col h-full">
      {/* Month header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">{capitalizedMonth}</h2>
        <div className="w-5" />
      </div>

      {/* Week day picker */}
      <div className="relative">
        <div className="flex items-center px-2 py-4">
          <button
            onClick={() => setWeekOffset((prev) => Math.max(prev - 1, 0))}
            className="p-1 flex-shrink-0"
            disabled={weekOffset === 0}
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5",
                weekOffset === 0 ? "text-muted-foreground/30" : "text-foreground"
              )}
            />
          </button>

          <div className="flex gap-1 overflow-x-auto flex-1 justify-center">
            {weekDays.map((date) => {
              const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
              const isSunday = date.getDay() === 0;
              const isSelected = isSameDay(date, selectedDate);
              const availability = getDayAvailability(date);
              const isDisabled = isPast || isSunday;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && onDateChange(date)}
                  disabled={isDisabled}
                  className={cn(
                    "flex flex-col items-center py-2 px-3 rounded-lg min-w-[52px] transition-all",
                    isSelected && "bg-primary",
                    !isSelected && !isDisabled && "hover:bg-muted",
                    isDisabled && "opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium uppercase",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {format(date, "EEE", { locale: ptBR }).replace(".", "")}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {format(date, "d")}
                  </span>
                  {availability && !isDisabled && (
                    <div
                      className={cn(
                        "w-4 h-1 rounded-full mt-1",
                        isSelected ? "bg-primary-foreground" : availability
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-1 flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex justify-center gap-4 py-4 border-t border-b border-border">
        {(["Manhã", "Tarde", "Noite"] as TimePeriod[]).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedPeriod === period
                ? "bg-card border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Time slots */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2">
          {filteredTimes.map((time) => {
            const isBlocked = blockedTimes.includes(time);
            const isBooked = bookedTimes.includes(time);
            const isUnavailable = isBlocked || isBooked;
            const isSelected = selectedTime === time;

            return (
              <button
                key={time}
                onClick={() => !isUnavailable && onTimeChange(time)}
                disabled={isUnavailable}
                className={cn(
                  "py-2.5 rounded-full text-sm font-medium transition-all border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : isUnavailable
                    ? "bg-muted/50 text-muted-foreground border-border opacity-50 cursor-not-allowed"
                    : "bg-card text-foreground border-border hover:border-primary"
                )}
              >
                {time}
              </button>
            );
          })}
        </div>

        {filteredTimes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum horário disponível neste período
          </div>
        )}
      </div>

      {/* Service summary card */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {selectedServices.map((item, index) => (
          <div
            key={index}
            className="bg-card rounded-lg p-4 mb-3 border border-border"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-foreground">{item.service.name}</h3>
                {selectedTime && index === currentServiceIndex && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedTime} - {getEndTime(selectedTime, item.service.duration)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-semibold text-foreground">
                  R$ {item.service.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Barber selector */}
            {barbers.length > 0 && index === currentServiceIndex && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Funcionário:</span>
                  <select
                    value={selectedBarber}
                    onChange={(e) => onBarberChange(e.target.value)}
                    className="flex-1 bg-transparent text-foreground text-sm outline-none"
                  >
                    <option value="">Qualquer profissional</option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                  {selectedBarberData && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {selectedBarberData.image_url ? (
                        <img
                          src={selectedBarberData.image_url}
                          alt={selectedBarberData.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add another service */}
        <button
          onClick={onAddService}
          className="flex items-center gap-2 text-primary font-medium py-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar outro serviço
        </button>
      </div>

      {/* Footer with total and continue button */}
      <div className="border-t border-border p-4 bg-background">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">Total :</span>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-foreground">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-muted-foreground">
              {formatDuration(totalDuration)}
            </span>
          </div>
        </div>

        <Button
          onClick={onContinue}
          disabled={!selectedTime || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-6 text-base"
        >
          {loading ? "Agendando..." : "Continuar"}
        </Button>
      </div>
    </div>
  );
};
