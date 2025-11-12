import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Edit, User as UserIcon, Smartphone, Mail, Plus, Receipt, Globe } from 'lucide-react';
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
  const [notes, setNotes] = useState(booking?.notes || '');

  const handleUpdateNotes = () => {
    if (!booking) return;
    onUpdateNotes(booking.id, notes);
  };

  const handleComplete = () => {
    if (!booking) return;
    onUpdateStatus(booking.id, 'completed');
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (!booking) return;
    onCancel(booking.id);
    onOpenChange(false);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            ℹ️ Selecione o que deseja fazer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Grid Layout - 2 colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 text-sm">
            {/* Usuário */}
            <div className="font-medium">Usuário:</div>
            <div className="flex flex-wrap items-center gap-2">
              <span>{booking.client_name || 'Sem Cadastro'}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <UserIcon className="h-3 w-3 mr-1" />
                Alterar Cliente
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                Info
              </Button>
            </div>

            {/* Serviço */}
            <div className="font-medium">Serviço:</div>
            <div>{booking.service_name} - {booking.booking_time}</div>

            {/* Origem */}
            <div className="font-medium">Origem:</div>
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span>Web</span>
            </div>

            {/* Data/Usuário Cadastro */}
            <div className="font-medium">Data/Usuário Cadastro:</div>
            <div>
              {format(new Date(booking.booking_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>

            {/* Valor */}
            <div className="font-medium">Valor:</div>
            <div>50,00</div>

            {/* Comanda */}
            <div className="font-medium">Comanda:</div>
            <div className="flex items-center gap-2">
              <span>50,00 | 177967317</span>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Receipt className="h-3 w-3 mr-1" />
                Ver
              </Button>
            </div>

            {/* Editar */}
            <div className="font-medium">Editar:</div>
            <div>
              <Button size="sm" className="h-8 text-xs">
                <Edit className="h-3 w-3 mr-1" />
                Editar Agendamento
              </Button>
            </div>

            {/* Celular */}
            <div className="font-medium">Celular:</div>
            <div>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white border-0">
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            {/* E-mail */}
            <div className="font-medium">E-mail:</div>
            <div className="text-muted-foreground">-</div>

            {/* Observações */}
            <div className="font-medium">Observações:</div>
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm text-muted-foreground">
                {notes || 'Sem observações'}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={handleUpdateNotes}
              >
                Alterar
              </Button>
            </div>

            {/* Tags */}
            <div className="font-medium">Tags:</div>
            <div>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer com botões de ação */}
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button 
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            onClick={handleComplete}
          >
            Realizado/Comanda
          </Button>
          <Button 
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            onClick={handleCancel}
          >
            Ausência
          </Button>
          <Button 
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button 
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
          >
            + Serviço
          </Button>
          <Button 
            className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 text-white"
          >
            + Produto
          </Button>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
