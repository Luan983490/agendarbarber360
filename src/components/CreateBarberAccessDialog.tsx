import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Key, Loader2 } from 'lucide-react';

interface CreateBarberAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: {
    id: string;
    name: string;
  };
  barbershopId: string;
  onAccessCreated: () => void;
}

export function CreateBarberAccessDialog({
  open,
  onOpenChange,
  barber,
  barbershopId,
  onAccessCreated
}: CreateBarberAccessDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateAccess = async () => {
    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Email inválido');
      return;
    }

    setLoading(true);
    const password = generatePassword();

    try {
      // Call edge function to create user with admin privileges (no email confirmation)
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ppmiandwpebzsfqqhhws.supabase.co/functions/v1/create-barber-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            barberName: barber.name,
            barberId: barber.id,
            barbershopId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar acesso');
      }

      setGeneratedPassword(password);
      toast.success('Acesso criado com sucesso!');
      onAccessCreated();
    } catch (error: any) {
      console.error('Error creating barber access:', error);
      toast.error(error.message || 'Erro ao criar acesso');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    const text = `Email: ${email}\nSenha: ${generatedPassword}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  const handleClose = () => {
    setEmail('');
    setGeneratedPassword(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Criar Acesso para {barber.name}
          </DialogTitle>
          <DialogDescription>
            Crie um login para que o barbeiro possa acessar sua agenda pessoal.
          </DialogDescription>
        </DialogHeader>

        {!generatedPassword ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="barber-email">Email do barbeiro</Label>
                <Input
                  id="barber-email"
                  type="email"
                  placeholder="barbeiro@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Uma senha temporária será gerada automaticamente
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAccess} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Acesso
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Acesso criado com sucesso!
                  </p>
                  <div className="space-y-2 bg-background p-3 rounded-md border">
                    <div>
                      <span className="text-muted-foreground text-sm">Email:</span>
                      <p className="font-mono font-medium">{email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Senha temporária:</span>
                      <p className="font-mono font-medium">{generatedPassword}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Anote essas credenciais e passe para o barbeiro. Ele poderá alterar a senha depois.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={copyCredentials}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Credenciais
              </Button>
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
