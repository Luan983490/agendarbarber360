import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

const ChooseUserType = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] flex flex-col items-center px-4 py-16 md:py-20">
      {/* Header - large elegant type like reference */}
      <div className="text-center mb-12 md:mb-16">
        <img src={b360Logo} alt="Barber360" className="h-8 mx-auto mb-10 opacity-60" />
        <div className="relative">
          <p className="text-[hsl(0,0%,40%)] text-xs uppercase tracking-[0.4em] mb-5">
            Escolha seu perfil
          </p>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold text-[hsl(0,0%,95%)] leading-[0.85] tracking-tighter">
            Barber
          </h1>
          <span className="absolute -top-1 right-0 md:-right-4 text-2xl md:text-4xl font-light italic text-[hsl(0,0%,50%)]">
            360
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="w-full max-w-[680px] space-y-4">
        {/* Card Cliente */}
        <div
          className="bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,15%)] rounded-xl p-5 md:p-7 cursor-pointer transition-all duration-200 hover:border-[hsl(45,93%,58%,0.4)]"
          onClick={() => navigate('/login/client')}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold text-[hsl(0,0%,90%)] mb-3.5">
                Sou Cliente
              </h2>
              <ul className="space-y-1.5 text-[13px] text-[hsl(0,0%,55%)] leading-relaxed">
                <li>· Agendar online 24/7</li>
                <li>· Ver horários disponíveis</li>
                <li>· Avaliar e favoritar barbearias</li>
                <li>· Programa de fidelidade</li>
              </ul>
            </div>
            <div className="text-right shrink-0 pt-1">
              <p className="text-4xl md:text-[56px] font-bold text-[hsl(0,0%,96%)] leading-none tracking-tight">
                Grátis
              </p>
              <p className="text-[11px] text-[hsl(0,0%,42%)] mt-2">Para sempre</p>
              <p className="text-[10px] text-[hsl(0,0%,32%)] mt-1">Sem cartão necessário</p>
            </div>
          </div>
        </div>

        {/* Card Barbearia */}
        <div
          className="bg-[hsl(0,0%,9%)] border border-[hsl(0,0%,15%)] rounded-xl p-5 md:p-7 cursor-pointer transition-all duration-200 hover:border-[hsl(45,93%,58%,0.4)]"
          onClick={() => navigate('/login/barbershop')}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold text-[hsl(0,0%,90%)] mb-3.5">
                Sou Barbearia
              </h2>
              <ul className="space-y-1.5 text-[13px] text-[hsl(0,0%,55%)] leading-relaxed">
                <li>· Gestão de agenda online</li>
                <li>· Controle de profissionais</li>
                <li>· Relatórios e estatísticas</li>
                <li>· Gestão de clientes e fidelidade</li>
              </ul>
              <p className="text-[10px] text-[hsl(0,0%,35%)] mt-2">
                (agenda + relatórios + equipe completa)
              </p>
            </div>
            <div className="text-right shrink-0 pt-1">
              <p className="text-4xl md:text-[56px] font-bold text-[hsl(0,0%,96%)] leading-none tracking-tight">
                30 dias
              </p>
              <p className="text-[11px] text-[hsl(145,55%,48%)] mt-2 font-medium">Grátis para testar</p>
              <p className="text-[10px] text-[hsl(0,0%,32%)] mt-1.5 leading-relaxed">
                Sem compromisso<br />Cancele quando quiser
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full max-w-[680px] mt-8 grid grid-cols-2 gap-4">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/85 rounded-lg h-11 font-medium text-sm"
          onClick={() => navigate('/login/client')}
        >
          Entrar como Cliente
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/85 rounded-lg h-11 font-medium text-sm"
          onClick={() => navigate('/login/barbershop')}
        >
          Entrar como Barbearia
        </Button>
      </div>

      {/* Back */}
      <div className="mt-10">
        <Button
          variant="ghost"
          className="text-[hsl(0,0%,35%)] hover:text-[hsl(0,0%,70%)] hover:bg-transparent text-xs"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Voltar para o início
        </Button>
      </div>
    </div>
  );
};

export default ChooseUserType;
