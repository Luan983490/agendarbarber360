import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Scissors, Clock, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    status: string;
    client_name: string;
    service_name: string;
    notes?: string;
  } | null;
  onUpdateStatus: (bookingId: string, status: string) => void;
  onUpdateNotes: (bookingId: string, notes: string) => void;
  onCancel: (bookingId: string) => void;
}

export const BookingDetailsDialog = ({
  open,
  onOpenChange,
  booking,
  onUpdateStatus,
  onUpdateNotes,
  onCancel,
}: BookingDetailsDialogProps) => {
  const [status, setStatus] = useState(booking?.status || 'pending');
  const [notes, setNotes] = useState(booking?.notes || '');

  const handleSave = () => {
    if (!booking) return;
    
    if (status !== booking.status) {
      onUpdateStatus(booking.id, status);
    }
    if (notes !== booking.notes) {
      onUpdateNotes(booking.id, notes);
    }
    
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (!booking) return;
    onCancel(booking.id);
    onOpenChange(false);
  };

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

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={getStatusColor(booking.status)}>
              {getStatusText(booking.status)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{booking.client_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Serviço</p>
                <p className="font-semibold">{booking.service_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-semibold">
                  {format(new Date(booking.booking_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-semibold">{booking.booking_time}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Alterar Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o agendamento..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="destructive" onClick={handleCancel}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Cancelar Agendamento
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
