import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Edit, User as UserIcon, Smartphone, Mail, Plus, Receipt, Globe, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditBookingObservationsDialog } from './EditBookingObservationsDialog';
import { ClientInfoDialog } from './ClientInfoDialog';
import { BookingTagsDialog } from './BookingTagsDialog';
import { useToast } from '@/hooks/use-toast';

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
    total_price?: number;
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
  const [showObservationsDialog, setShowObservationsDialog] = useState(false);
  const [showClientInfoDialog, setShowClientInfoDialog] = useState(false);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSaveNotes = (newNotes: string) => {
    if (!booking) return;
    onUpdateNotes(booking.id, newNotes);
    toast({
      title: "Observações atualizadas",
      description: "As observações foram salvas com sucesso.",
    });
  };

  const handleComplete = () => {
    if (!booking) return;
    onUpdateStatus(booking.id, 'completed');
    toast({
      title: "Agendamento concluído",
      description: "O agendamento foi marcado como realizado.",
    });
    onOpenChange(false);
  };

  const handleAbsence = () => {
    if (!booking) return;
    onUpdateStatus(booking.id, 'cancelled');
    toast({
      title: "Ausência registrada",
      description: "O cliente foi marcado como ausente.",
      variant: "destructive",
    });
    onOpenChange(false);
  };

  const handleCancelBooking = () => {
    if (!booking) return;
    onCancel(booking.id);
    toast({
      title: "Agendamento cancelado",
      description: "O agendamento foi cancelado com sucesso.",
      variant: "destructive",
    });
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    // Simula envio de WhatsApp (pode ser integrado com API real)
    const message = `Olá ${booking?.client_name}, seu agendamento está confirmado!`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleEditBooking = () => {
    toast({
      title: "Editor de agendamento",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleChangeClient = () => {
    toast({
      title: "Alterar cliente",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleViewComanda = () => {
    toast({
      title: "Visualizar comanda",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleAddService = () => {
    toast({
      title: "Adicionar serviço",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleAddProduct = () => {
    toast({
      title: "Adicionar produto",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleSaveTags = (newTags: string[]) => {
    setTags(newTags);
    toast({
      title: "Tags atualizadas",
      description: "As tags foram salvas com sucesso.",
    });
  };

  if (!booking) return null;

  return (
    <>
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs"
                  onClick={handleChangeClient}
                >
                  <UserIcon className="h-3 w-3 mr-1" />
                  Alterar Cliente
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs px-2"
                  onClick={() => setShowClientInfoDialog(true)}
                >
                  <Info className="h-3 w-3" />
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
              <div>R$ {booking.total_price || '50,00'}</div>

              {/* Comanda */}
              <div className="font-medium">Comanda:</div>
              <div className="flex items-center gap-2">
                <span>R$ {booking.total_price || '50,00'} | #{booking.id.slice(0, 8)}</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs"
                  onClick={handleViewComanda}
                >
                  <Receipt className="h-3 w-3 mr-1" />
                  Ver
                </Button>
              </div>

              {/* Editar */}
              <div className="font-medium">Editar:</div>
              <div>
                <Button 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleEditBooking}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar Agendamento
                </Button>
              </div>

              {/* Celular */}
              <div className="font-medium">Celular:</div>
              <div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white border-0"
                  onClick={handleWhatsApp}
                >
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
                  {booking.notes || 'Sem observações'}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs"
                  onClick={() => setShowObservationsDialog(true)}
                >
                  Alterar
                </Button>
              </div>

              {/* Tags */}
              <div className="font-medium">Tags:</div>
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 w-7 p-0"
                  onClick={() => setShowTagsDialog(true)}
                >
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
              onClick={handleAbsence}
            >
              Ausência
            </Button>
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCancelBooking}
            >
              Cancelar
            </Button>
            <Button 
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleAddService}
            >
              + Serviço
            </Button>
            <Button 
              className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 text-white"
              onClick={handleAddProduct}
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

      {/* Dialogs auxiliares */}
      <EditBookingObservationsDialog
        open={showObservationsDialog}
        onOpenChange={setShowObservationsDialog}
        currentNotes={booking.notes || ''}
        onSave={handleSaveNotes}
      />

      <ClientInfoDialog
        open={showClientInfoDialog}
        onOpenChange={setShowClientInfoDialog}
        clientName={booking.client_name}
      />

      <BookingTagsDialog
        open={showTagsDialog}
        onOpenChange={setShowTagsDialog}
        currentTags={tags}
        onSave={handleSaveTags}
      />
    </>
  );
};
