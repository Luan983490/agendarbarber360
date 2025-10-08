import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  client: { display_name: string };
  service: { name: string };
  barber?: { name: string } | null;
}

interface ScheduleCalendarProps {
  bookings: Booking[];
  onDateSelect: (date: Date | undefined) => void;
  selectedDate: Date | undefined;
}

export const ScheduleCalendar = ({ bookings, onDateSelect, selectedDate }: ScheduleCalendarProps) => {
  // Get all dates that have bookings
  const bookingDates = bookings.map(b => new Date(b.booking_date).toDateString());
  const uniqueBookingDates = [...new Set(bookingDates)];

  // Get bookings for selected date
  const selectedDateBookings = selectedDate
    ? bookings.filter(b => new Date(b.booking_date).toDateString() === selectedDate.toDateString())
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            locale={pt}
            className={cn("rounded-md border pointer-events-auto")}
            modifiers={{
              booked: (date) => uniqueBookingDates.includes(date.toDateString())
            }}
            modifiersClassNames={{
              booked: "bg-primary/20 font-bold"
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate 
              ? `Agendamentos - ${format(selectedDate, "dd 'de' MMMM", { locale: pt })}`
              : 'Selecione uma data'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {selectedDate 
                ? 'Nenhum agendamento para esta data'
                : 'Selecione uma data no calendário'
              }
            </p>
          ) : (
            <div className="space-y-4">
              {selectedDateBookings
                .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{booking.booking_time}</p>
                        <Badge className={cn(getStatusColor(booking.status), "text-white")}>
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>
                      <p className="text-sm">Cliente: {booking.client?.display_name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        Serviço: {booking.service?.name || 'N/A'}
                      </p>
                      {booking.barber && (
                        <p className="text-sm text-muted-foreground">
                          Barbeiro: {booking.barber.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
