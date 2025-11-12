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
import { User, Scissors, Clock, Calendar, AlertCircle, Edit } from 'lucide-react';
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
  const [bookingType, setBookingType] = useState('tipo');

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={bookingType} onValueChange={setBookingType}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tipo">Tipo</SelectItem>
                <SelectItem value="apenas-horario">Apenas Horário</SelectItem>
                <SelectItem value="apenas-servico">Apenas Serviço</SelectItem>
                <SelectItem value="apenas-profissional">Apenas Profissional</SelectItem>
                <SelectItem value="horario-profissional">Horário e Profissional</SelectItem>
                <SelectItem value="horario-servico">Horário e Serviço</SelectItem>
                <SelectItem value="profissional-servico">Profissional e Serviço</SelectItem>
                <SelectItem value="servico-profissional-horario">Serviço, Profissional e Horário</SelectItem>
                <SelectItem value="duracao">Duração</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Fechar
          </Button>
          <Button variant="destructive" onClick={handleCancel} className="w-full sm:w-auto">
            <AlertCircle className="mr-2 h-4 w-4" />
            Cancelar Agendamento
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
