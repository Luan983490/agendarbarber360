import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Scissors, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from './ImageUpload';
import BarberWorkingHoursForm from './BarberWorkingHoursForm';
import BarberServicesForm from './BarberServicesForm';

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  image_url?: string;
  barbershop_id: string;
}

interface EditBarberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber;
  onBarberUpdated: () => void;
}

export const EditBarberDialog = ({ open, onOpenChange, barber, onBarberUpdated }: EditBarberDialogProps) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    name: barber.name,
    specialty: barber.specialty || '',
    phone: barber.phone || '',
    image_url: barber.image_url || '',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSavePersonalData = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do barbeiro é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('barbers')
        .update({
          name: formData.name,
          specialty: formData.specialty || null,
          phone: formData.phone || null,
          image_url: formData.image_url || null,
        })
        .eq('id', barber.id);

      if (error) throw error;

      toast({
        title: "Dados salvos!",
        description: "As informações do profissional foram atualizadas."
      });

      onBarberUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Profissional - {barber.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Pessoais</span>
              <span className="sm:hidden">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Scissors className="h-4 w-4" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horário de Trabalho</span>
              <span className="sm:hidden">Horário</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4 space-y-4">
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-specialty">Especialidade</Label>
                <Textarea
                  id="edit-specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Ex: Especialista em cortes clássicos..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Foto</Label>
                <ImageUpload
                  currentImageUrl={formData.image_url}
                  onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  bucket="barber-images"
                  folder="profile"
                />
              </div>

              <Button onClick={handleSavePersonalData} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Dados Pessoais'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <BarberServicesForm 
              barberId={barber.id} 
              barbershopId={barber.barbershop_id} 
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <BarberWorkingHoursForm 
              barberId={barber.id} 
              barberName={barber.name} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditBarberDialog;
