import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { User, MapPin, Lock, Key, Shield } from 'lucide-react';
import { profileUpdateSchema, validateWithSchema, formatValidationErrors, sanitizeString } from '@/lib/validation-schemas';
import { MFAEnrollment } from '@/components/mfa';

interface Profile {
  display_name: string;
  phone: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  address?: {
    country: string;
    postal_code: string;
    street: string;
    neighborhood: string;
    number: string;
    complement: string;
    state: string;
    city: string;
  };
}

const Profile = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    phone: '',
    address: {
      country: 'Brasil',
      postal_code: '',
      street: '',
      neighborhood: '',
      number: '',
      complement: '',
      state: '',
      city: ''
    }
  });
  const [activeTab, setActiveTab] = useState<'data' | 'address' | 'security' | 'access'>('data');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'data' || tab === 'address' || tab === 'security' || tab === 'access') {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile({
          display_name: data.display_name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url,
          birth_date: (data as any).birth_date,
          gender: (data as any).gender,
          address: (data as any).address || profile.address
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Sanitizar e preparar dados
    const dataToValidate = {
      display_name: profile.display_name ? sanitizeString(profile.display_name) : undefined,
      phone: profile.phone ? sanitizeString(profile.phone) : null,
      birth_date: profile.birth_date || null,
      gender: profile.gender as 'male' | 'female' | 'other' | undefined,
      address: profile.address ? {
        country: sanitizeString(profile.address.country || 'Brasil'),
        postal_code: sanitizeString(profile.address.postal_code || ''),
        street: sanitizeString(profile.address.street || ''),
        neighborhood: sanitizeString(profile.address.neighborhood || ''),
        number: sanitizeString(profile.address.number || ''),
        complement: sanitizeString(profile.address.complement || ''),
        state: sanitizeString(profile.address.state || ''),
        city: sanitizeString(profile.address.city || ''),
      } : null,
    };

    // Validação com Zod
    const validation = validateWithSchema(profileUpdateSchema, dataToValidate);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: validation.data.display_name,
          phone: validation.data.phone,
          birth_date: validation.data.birth_date,
          gender: validation.data.gender,
          address: validation.data.address
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A exclusão de conta será implementada em breve."
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <User className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton />
      
      <main className="container mx-auto px-4 py-8 mt-14">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-8 mb-8">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {profile.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name || 'Usuário'}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b">
            <Button
              variant={activeTab === 'data' ? 'default' : 'ghost'}
              className="rounded-b-none"
              onClick={() => setActiveTab('data')}
            >
              <User className="h-4 w-4 mr-2" />
              Meus Dados
            </Button>
            <Button
              variant={activeTab === 'address' ? 'default' : 'ghost'}
              className="rounded-b-none"
              onClick={() => setActiveTab('address')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Endereço
            </Button>
            <Button
              variant={activeTab === 'security' ? 'default' : 'ghost'}
              className="rounded-b-none"
              onClick={() => setActiveTab('security')}
            >
              <Lock className="h-4 w-4 mr-2" />
              Segurança
            </Button>
            <Button
              variant={activeTab === 'access' ? 'default' : 'ghost'}
              className="rounded-b-none"
              onClick={() => setActiveTab('access')}
            >
              <Key className="h-4 w-4 mr-2" />
              Acessos
            </Button>
          </div>

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="birthdate">Data de nascimento</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={profile.birth_date || ''}
                  onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                  placeholder="Informe a data"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="phone">Celular *</Label>
                <div className="flex gap-2 mt-2">
                  <Select defaultValue="+55">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+55">🇧🇷 +55</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+55 (51) 986343633"
                  />
                </div>
              </div>

              <div>
                <Label>Gênero</Label>
                <RadioGroup
                  value={profile.gender || ''}
                  onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="font-normal">Masculino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="font-normal">Feminino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="font-normal">Outros</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">País *</Label>
                  <Input
                    id="country"
                    value={profile.address?.country || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      address: { ...profile.address!, country: e.target.value }
                    })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">CEP *</Label>
                  <Input
                    id="postal_code"
                    value={profile.address?.postal_code || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      address: { ...profile.address!, postal_code: e.target.value }
                    })}
                    placeholder="CEP"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="street">Endereço *</Label>
                <Input
                  id="street"
                  value={profile.address?.street || ''}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: { ...profile.address!, street: e.target.value }
                  })}
                  placeholder="Endereço"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    value={profile.address?.neighborhood || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      address: { ...profile.address!, neighborhood: e.target.value }
                    })}
                    placeholder="Bairro"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={profile.address?.number || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      address: { ...profile.address!, number: e.target.value }
                    })}
                    placeholder="Número"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={profile.address?.complement || ''}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: { ...profile.address!, complement: e.target.value }
                  })}
                  placeholder="Complemento"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={profile.address?.state || ''}
                    onValueChange={(value) => setProfile({
                      ...profile,
                      address: { ...profile.address!, state: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Select
                    value={profile.address?.city || ''}
                    onValueChange={(value) => setProfile({
                      ...profile,
                      address: { ...profile.address!, city: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione uma cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porto-alegre">Porto Alegre</SelectItem>
                      <SelectItem value="sao-paulo">São Paulo</SelectItem>
                      <SelectItem value="rio-de-janeiro">Rio de Janeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* MFA Enrollment Component */}
              <MFAEnrollment />

              <div className="pt-6 border-t">
                <Label>Senha</Label>
                <Button variant="outline" className="w-full mt-2 justify-start" onClick={() => {
                  toast({
                    title: "Funcionalidade em desenvolvimento",
                    description: "A alteração de senha será implementada em breve."
                  });
                }}>
                  Alterar senha
                </Button>
              </div>
              
              <div className="pt-6 border-t">
                <Button variant="destructive" className="w-full" onClick={handleDeleteAccount}>
                  Excluir conta
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                <div>
                  <p className="font-semibold">Google</p>
                  <p className="text-sm text-muted-foreground">Conectar com Google</p>
                </div>
                <Button variant="outline" size="sm">
                  <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Novo</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
