import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Edit, User as UserIcon, Smartphone, Plus, Receipt, Globe, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditBookingObservationsDialog } from './EditBookingObservationsDialog';
import { ClientInfoDialog } from './ClientInfoDialog';
import { BookingTagsDialog } from './BookingTagsDialog';
import { EditBookingDialog } from './EditBookingDialog';
import { AddServiceToBookingDialog } from './AddServiceToBookingDialog';
import { AddProductToBookingDialog } from './AddProductToBookingDialog';
import { ViewComandaDialog } from './ViewComandaDialog';
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
    barbershop_id?: string;
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showViewComandaDialog, setShowViewComandaDialog] = useState(false);
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
    setShowEditDialog(true);
  };

  const handleSaveEditedBooking = (data: { tipo: string }) => {
    toast({
      title: "Agendamento atualizado",
      description: `Tipo de edição: ${data.tipo}`,
    });
  };

  const handleChangeClient = () => {
    toast({
      title: "Alterar cliente",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleViewComanda = () => {
    setShowViewComandaDialog(true);
  };

  const handleAddService = () => {
    setShowAddServiceDialog(true);
  };

  const handleAddProduct = () => {
    setShowAddProductDialog(true);
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              ℹ️ Selecione o que deseja fazer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Grid Layout - Responsivo */}
            <div className="grid grid-cols-1 gap-3 text-sm">
              {/* Usuário */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Usuário:</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{booking.client_name || 'Sem Cadastro'}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={handleChangeClient}
                  >
                    <UserIcon className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Alterar</span>
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
              </div>

              {/* Serviço */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Serviço:</div>
                <div className="text-sm">{booking.service_name} - {booking.booking_time}</div>
              </div>

              {/* Origem */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Origem:</div>
                <div className="flex items-center gap-1 text-sm">
                  <Globe className="h-3 w-3" />
                  <span>Web</span>
                </div>
              </div>

              {/* Data/Cadastro */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Data/Cadastro:</div>
                <div className="text-sm">
                  {format(new Date(booking.booking_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
              </div>

              {/* Valor */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Valor:</div>
                <div className="text-sm font-semibold">R$ {booking.total_price || '50,00'}</div>
              </div>

              {/* Comanda */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Comanda:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">R$ {booking.total_price || '50,00'} | #{booking.id.slice(0, 8)}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={handleViewComanda}
                  >
                    <Receipt className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Ver</span>
                  </Button>
                </div>
              </div>

              {/* Editar */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Editar:</div>
                <Button 
                  size="sm" 
                  className="h-8 text-xs w-full sm:w-auto"
                  onClick={handleEditBooking}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar Agendamento
                </Button>
              </div>

              {/* Celular */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Celular:</div>
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
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">E-mail:</div>
                <div className="text-sm text-muted-foreground">-</div>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Observações:</div>
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
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground text-xs">Tags:</div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhuma tag</span>
                    ) : (
                      tags.map((tag) => (
                        <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => setShowTagsDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer com botões de ação */}
          <DialogFooter className="flex flex-col gap-2 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                onClick={handleComplete}
              >
                Realizado
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
                onClick={handleAbsence}
              >
                Ausência
              </Button>
              <Button 
                variant="outline"
                className="text-xs sm:text-sm"
                onClick={handleCancelBooking}
              >
                Cancelar
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm"
                onClick={handleAddService}
              >
                + Serviço
              </Button>
              <Button 
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm"
                onClick={handleAddProduct}
              >
                + Produto
              </Button>
              <Button 
                className="text-xs sm:text-sm"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
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

      {booking && (
        <>
          <EditBookingDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            booking={booking}
            onSave={handleSaveEditedBooking}
          />

          <AddServiceToBookingDialog
            open={showAddServiceDialog}
            onOpenChange={setShowAddServiceDialog}
            bookingId={booking.id}
            barbershopId={booking.barbershop_id || ''}
          />

          <AddProductToBookingDialog
            open={showAddProductDialog}
            onOpenChange={setShowAddProductDialog}
            bookingId={booking.id}
            barbershopId={booking.barbershop_id || ''}
          />

          <ViewComandaDialog
            open={showViewComandaDialog}
            onOpenChange={setShowViewComandaDialog}
            booking={booking}
          />
        </>
      )}
    </>
  );
};
