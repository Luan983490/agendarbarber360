import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  Pencil,
  MessageCircle,
} from 'lucide-react';
import type { ClientDetails } from '@/hooks/useClients';

interface ClientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onLoadDetails: (clientId: string) => Promise<ClientDetails | null>;
  onEdit: () => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-destructive/20 text-destructive',
  no_show: 'bg-orange-500/20 text-orange-400',
};

export function ClientDetailsDialog({
  open,
  onOpenChange,
  clientId,
  onLoadDetails,
  onEdit,
}: ClientDetailsDialogProps) {
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      setLoading(true);
      onLoadDetails(clientId).then((data) => {
        setDetails(data);
        setLoading(false);
      });
    } else {
      setDetails(null);
    }
  }, [open, clientId, onLoadDetails]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-56" />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : details ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {details.client_name}
                  </DialogTitle>
                  {!details.is_active && (
                    <Badge variant="destructive" className="mt-1">
                      Inativo
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Contact info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`https://wa.me/55${details.client_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {formatPhone(details.client_phone)}
                    <MessageCircle className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{details.client_email}</span>
                </div>
              </div>

              {/* Tags */}
              {details.tags && details.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {details.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Notes */}
              {details.client_notes && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground text-xs mb-1 font-medium">
                    Notas
                  </p>
                  <p>{details.client_notes}</p>
                </div>
              )}

              <Separator />

              {/* Stats */}
              <div>
                <h4 className="text-sm font-medium mb-3">Estatísticas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      Total Agendamentos
                    </p>
                    <p className="text-lg font-bold">{details.total_bookings}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(details.total_spent)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      Primeira Visita
                    </p>
                    <p className="text-sm font-medium">
                      {formatDate(details.first_booking_date)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Última Visita</p>
                    <p className="text-sm font-medium">
                      {formatDate(details.last_booking_date)}
                    </p>
                  </div>
                  {details.favorite_barber_name && (
                    <div className="bg-muted/30 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Barbeiro Favorito
                      </p>
                      <p className="text-sm font-medium">
                        {details.favorite_barber_name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking history */}
              {details.recent_bookings && details.recent_bookings.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Últimos Agendamentos
                    </h4>
                    <div className="space-y-2">
                      {details.recent_bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="bg-muted/20 border border-border rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {formatDate(booking.date)} - {booking.time?.slice(0, 5)}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                statusColors[booking.status] || 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {statusLabels[booking.status] || booking.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>
                              {booking.service_name} • {booking.barber_name}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(booking.total_price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Não foi possível carregar os detalhes do cliente.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
