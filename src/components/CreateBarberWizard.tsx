import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ImageUpload from '@/components/ImageUpload';
import { User, Scissors, Clock, Key, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface CreateBarberWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId: string;
  services: Service[];
  onBarberCreated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface WorkingHour {
  day_of_week: number;
  period1_start: string;
  period1_end: string;
  period2_start: string;
  period2_end: string;
  is_day_off: boolean;
}

const DEFAULT_WORKING_HOURS: WorkingHour[] = [
  { day_of_week: 0, period1_start: '', period1_end: '', period2_start: '', period2_end: '', is_day_off: true },
  { day_of_week: 1, period1_start: '09:00', period1_end: '12:00', period2_start: '14:00', period2_end: '18:00', is_day_off: false },
  { day_of_week: 2, period1_start: '09:00', period1_end: '12:00', period2_start: '14:00', period2_end: '18:00', is_day_off: false },
  { day_of_week: 3, period1_start: '09:00', period1_end: '12:00', period2_start: '14:00', period2_end: '18:00', is_day_off: false },
  { day_of_week: 4, period1_start: '09:00', period1_end: '12:00', period2_start: '14:00', period2_end: '18:00', is_day_off: false },
  { day_of_week: 5, period1_start: '09:00', period1_end: '12:00', period2_start: '14:00', period2_end: '18:00', is_day_off: false },
  { day_of_week: 6, period1_start: '09:00', period1_end: '12:00', period2_start: '14:00', period2_end: '18:00', is_day_off: false },
];

export const CreateBarberWizard = ({ 
  open, 
  onOpenChange, 
  barbershopId, 
  services,
  onBarberCreated 
}: CreateBarberWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [createdBarberId, setCreatedBarberId] = useState<string | null>(null);
  const { toast } = useToast();

  // Step 1: Personal Data
  const [personalData, setPersonalData] = useState({
    name: '',
    phone: '',
    specialty: '',
    image_url: '',
  });

  // Step 2: Services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Step 3: Working Hours
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(DEFAULT_WORKING_HOURS);

  // Step 4: Login
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [loginCreated, setLoginCreated] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);

  const steps = [
    { number: 1, title: 'Dados Pessoais', icon: User },
    { number: 2, title: 'Serviços', icon: Scissors },
    { number: 3, title: 'Horários', icon: Clock },
    { number: 4, title: 'Acesso', icon: Key },
  ];

  const resetForm = () => {
    setCurrentStep(1);
    setPersonalData({ name: '', phone: '', specialty: '', image_url: '' });
    setSelectedServices([]);
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setLoginData({ email: '', password: '' });
    setLoginCreated(false);
    setGeneratedCredentials(null);
    setCreatedBarberId(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Step 1: Save personal data and create barber
  const savePersonalData = async () => {
    if (!personalData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('barbers')
        .insert({
          barbershop_id: barbershopId,
          name: personalData.name,
          phone: personalData.phone || null,
          specialty: personalData.specialty || null,
          image_url: personalData.image_url || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCreatedBarberId(data.id);
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar profissional",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Save services
  const saveServices = async () => {
    if (!createdBarberId) return false;
    
    if (selectedServices.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um serviço",
        variant: "destructive"
      });
      return false;
    }

    setSaving(true);
    try {
      const servicesToInsert = selectedServices.map(serviceId => ({
        barber_id: createdBarberId,
        service_id: serviceId,
      }));

      const { error } = await supabase
        .from('barber_services')
        .insert(servicesToInsert);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao salvar serviços",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 3: Save working hours
  const saveWorkingHours = async () => {
    if (!createdBarberId) return false;

    setSaving(true);
    try {
      const hoursToInsert = workingHours.map(wh => ({
        barber_id: createdBarberId,
        day_of_week: wh.day_of_week,
        period1_start: wh.is_day_off ? null : (wh.period1_start || null),
        period1_end: wh.is_day_off ? null : (wh.period1_end || null),
        period2_start: wh.is_day_off ? null : (wh.period2_start || null),
        period2_end: wh.is_day_off ? null : (wh.period2_end || null),
        is_day_off: wh.is_day_off,
      }));

      const { error } = await supabase
        .from('barber_working_hours')
        .insert(hoursToInsert);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao salvar horários",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 4: Create login
  const createLogin = async () => {
    if (!createdBarberId) return;
    
    if (!loginData.email.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      toast({
        title: "Erro",
        description: "Email inválido",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const password = generatePassword();

      const { data, error } = await supabase.functions.invoke('create-barber-user', {
        body: {
          email: loginData.email,
          password: password,
          barberId: createdBarberId,
          barbershopId: barbershopId,
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setGeneratedCredentials({ email: loginData.email, password });
      setLoginCreated(true);

      toast({
        title: "Acesso criado!",
        description: "As credenciais foram geradas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar acesso",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const success = await savePersonalData();
      if (success) setCurrentStep(2);
    } else if (currentStep === 2) {
      const success = await saveServices();
      if (success) setCurrentStep(3);
    } else if (currentStep === 3) {
      const success = await saveWorkingHours();
      if (success) setCurrentStep(4);
    }
  };

  const handleFinish = () => {
    toast({
      title: "Profissional cadastrado!",
      description: "O profissional foi cadastrado com sucesso."
    });
    onBarberCreated();
    handleClose();
  };

  const handleSkipLogin = () => {
    handleFinish();
  };

  const handleWorkingHourChange = (dayIndex: number, field: keyof WorkingHour, value: any) => {
    setWorkingHours(prev => prev.map((wh, i) => 
      i === dayIndex ? { ...wh, [field]: value } : wh
    ));
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const copyCredentials = () => {
    if (generatedCredentials) {
      navigator.clipboard.writeText(
        `Email: ${generatedCredentials.email}\nSenha: ${generatedCredentials.password}`
      );
      toast({
        title: "Copiado!",
        description: "Credenciais copiadas para a área de transferência"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Cadastrar Profissional
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div 
                key={step.number}
                className={`flex flex-col items-center gap-1 ${
                  currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep > step.number 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : currentStep === step.number 
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />
        </div>

        {/* Step 1: Personal Data */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </h3>
            
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={personalData.name}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Textarea
                  id="specialty"
                  value={personalData.specialty}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Ex: Cortes clássicos, barba..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Foto</Label>
                <ImageUpload
                  currentImageUrl={personalData.image_url}
                  onImageUploaded={(url) => setPersonalData(prev => ({ ...prev, image_url: url }))}
                  bucket="barber-images"
                  folder="profile"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Serviços Oferecidos
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecione os serviços que este profissional realiza
            </p>

            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço cadastrado na barbearia. Cadastre serviços primeiro.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedServices.includes(service.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleService(service.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {service.price.toFixed(2)} • {service.duration} min
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Working Hours */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Trabalho
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure os horários de trabalho para cada dia da semana
            </p>

            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {workingHours.map((wh, index) => (
                <div 
                  key={wh.day_of_week} 
                  className={`p-3 rounded-lg border ${wh.is_day_off ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Checkbox
                        checked={wh.is_day_off}
                        onCheckedChange={(checked) => handleWorkingHourChange(index, 'is_day_off', checked)}
                      />
                      <span className={`font-medium ${wh.is_day_off ? 'text-muted-foreground line-through' : ''}`}>
                        {DAYS_OF_WEEK[index].label}
                      </span>
                    </div>
                    
                    {!wh.is_day_off && (
                      <div className="flex flex-wrap gap-2 flex-1">
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={wh.period1_start}
                            onChange={(e) => handleWorkingHourChange(index, 'period1_start', e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={wh.period1_end}
                            onChange={(e) => handleWorkingHourChange(index, 'period1_end', e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={wh.period2_start}
                            onChange={(e) => handleWorkingHourChange(index, 'period2_start', e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={wh.period2_end}
                            onChange={(e) => handleWorkingHourChange(index, 'period2_end', e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    
                    {wh.is_day_off && (
                      <span className="text-sm text-muted-foreground italic">Folga</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Login */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Key className="h-5 w-5" />
              Acesso do Profissional
            </h3>
            <p className="text-sm text-muted-foreground">
              Crie um login para que o profissional acesse sua agenda
            </p>

            {!loginCreated ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={createLogin} 
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Criar Acesso
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSkipLogin}
                  >
                    Pular
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-500 font-medium mb-2">Acesso criado com sucesso!</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Copie e envie as credenciais para o profissional:
                  </p>
                  <div className="bg-background p-3 rounded border space-y-2">
                    <p><strong>Email:</strong> {generatedCredentials?.email}</p>
                    <p><strong>Senha:</strong> {generatedCredentials?.password}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={copyCredentials}
                  >
                    Copiar credenciais
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          {currentStep > 1 && currentStep < 4 && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          
          {currentStep === 1 && <div />}
          
          {currentStep < 4 && (
            <Button onClick={handleNext} disabled={saving} className="ml-auto">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 4 && loginCreated && (
            <Button onClick={handleFinish} className="ml-auto">
              <Check className="h-4 w-4 mr-2" />
              Concluir
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
