import { Clock, Phone, MapPin, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorkingHours {
  day_of_week: number;
  is_day_off: boolean;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
}

interface BarbershopInfoTabProps {
  barbershopId: string;
  barbershop: {
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    opening_hours?: any;
  };
}

const SHORT_DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatTime = (time: string | null): string => {
  if (!time) return "";
  // Format HH:MM:SS to HH:MM
  return time.substring(0, 5).replace(":", "h");
};

const formatWorkingPeriods = (hours: WorkingHours): string => {
  if (hours.is_day_off) return "Fechado";
  
  const periods: string[] = [];
  
  if (hours.period1_start && hours.period1_end) {
    periods.push(`${formatTime(hours.period1_start)} - ${formatTime(hours.period1_end)}`);
  }
  
  if (hours.period2_start && hours.period2_end) {
    periods.push(`${formatTime(hours.period2_start)} - ${formatTime(hours.period2_end)}`);
  }
  
  return periods.length > 0 ? periods.join(" | ") : "Fechado";
};

// Group consecutive days with the same schedule
const groupWorkingHours = (workingHours: WorkingHours[]): { days: string; hours: string }[] => {
  if (workingHours.length === 0) return [];
  
  // Sort by day of week
  const sorted = [...workingHours].sort((a, b) => a.day_of_week - b.day_of_week);
  
  const groups: { days: number[]; hours: string }[] = [];
  
  sorted.forEach((hours) => {
    const hoursStr = formatWorkingPeriods(hours);
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && lastGroup.hours === hoursStr) {
      lastGroup.days.push(hours.day_of_week);
    } else {
      groups.push({ days: [hours.day_of_week], hours: hoursStr });
    }
  });
  
  return groups.map((group) => {
    const { days, hours } = group;
    let dayStr: string;
    
    if (days.length === 1) {
      dayStr = SHORT_DAY_NAMES[days[0]];
    } else if (days.length === 7) {
      dayStr = "Todos os dias";
    } else {
      // Check if consecutive
      const isConsecutive = days.every((day, idx) => 
        idx === 0 || day === days[idx - 1] + 1 || (days[idx - 1] === 6 && day === 0)
      );
      
      if (isConsecutive && days.length > 2) {
        dayStr = `${SHORT_DAY_NAMES[days[0]]} a ${SHORT_DAY_NAMES[days[days.length - 1]]}`;
      } else {
        dayStr = days.map(d => SHORT_DAY_NAMES[d]).join(", ");
      }
    }
    
    return { days: dayStr, hours };
  });
};

export const BarbershopInfoTab = ({ barbershopId, barbershop }: BarbershopInfoTabProps) => {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkingHours = async () => {
      try {
        const { data: barbers } = await supabase
          .from("barbers")
          .select("id")
          .eq("barbershop_id", barbershopId)
          .eq("is_active", true)
          .limit(1);

        if (barbers && barbers.length > 0) {
          const barberId = barbers[0].id;
          const { data: hours } = await supabase
            .from("barber_working_hours")
            .select("day_of_week, is_day_off, period1_start, period1_end, period2_start, period2_end")
            .eq("barber_id", barberId)
            .order("day_of_week");

          if (hours && hours.length > 0) {
            setWorkingHours(hours);
          }
        }
      } catch (error) {
        console.error("Error fetching working hours:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkingHours();
  }, [barbershopId]);

  const groupedHours = groupWorkingHours(workingHours);

  // Fallback: parse opening_hours JSON from barbershops table
  const fallbackHours = () => {
    if (!barbershop.opening_hours || typeof barbershop.opening_hours !== 'object') return [];
    const dayMapping: Record<string, string> = {
      sunday: "Dom", monday: "Seg", tuesday: "Ter", wednesday: "Qua",
      thursday: "Qui", friday: "Sex", saturday: "Sáb",
    };
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    
    return dayOrder.map((key) => {
      const dayData = (barbershop.opening_hours as any)?.[key];
      const dayName = dayMapping[key];
      if (!dayData || dayData.open === "Fechado" || dayData.close === "Fechado") {
        return { days: dayName, hours: "Fechado" };
      }
      return { days: dayName, hours: `${dayData.open} - ${dayData.close}` };
    });
  };

  const displayHours = groupedHours.length > 0 ? groupedHours : fallbackHours();

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          {barbershop.description && (
            <div>
              <h4 className="font-medium text-foreground">Sobre</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {barbershop.description}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Horário de Funcionamento</h4>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : displayHours.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {displayHours.map((group, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">{group.days}:</span> {group.hours}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Horário não informado</p>
              )}
            </div>
          </div>

          {barbershop.phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-medium text-foreground">Telefone</h4>
                <p className="text-sm text-muted-foreground">{barbershop.phone}</p>
              </div>
            </div>
          )}

          {barbershop.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-medium text-foreground">Email</h4>
                <p className="text-sm text-muted-foreground">{barbershop.email}</p>
              </div>
            </div>
          )}

          {barbershop.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-medium text-foreground">Endereço</h4>
                <p className="text-sm text-muted-foreground">{barbershop.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
