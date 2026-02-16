import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ChooseUserType = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] flex flex-col items-center justify-center px-4 py-12">
      {/* Cards */}
      <div className="w-full max-w-[700px] space-y-5">
        {/* Card Cliente */}
        <div
          className="bg-[hsl(0,0%,100%,0.04)] backdrop-blur-sm border border-[hsl(0,0%,100%,0.08)] rounded-2xl p-6 md:px-8 md:py-7 cursor-pointer transition-all duration-200 hover:border-[hsl(45,93%,58%,0.35)] hover:bg-[hsl(0,0%,100%,0.06)]"
          onClick={() => navigate('/login/client')}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] md:text-base font-semibold text-[hsl(0,0%,88%)] mb-4">
                Sou Cliente
              </h2>
              <ul className="space-y-2 text-[13px] font-light text-[hsl(0,0%,50%)] leading-relaxed">
                <li>· Agendar online 24/7</li>
                <li>· Ver horários disponíveis</li>
                <li>· Avaliar e favoritar barbearias</li>
                <li>· Programa de fidelidade</li>
              </ul>
            </div>
            <div className="text-right shrink-0">
              <p className="text-5xl md:text-6xl font-bold text-[hsl(0,0%,96%)] leading-none tracking-tight">
                Grátis
              </p>
              <p className="text-[11px] font-light text-[hsl(0,0%,40%)] mt-3">Para sempre</p>
              <p className="text-[10px] font-light text-[hsl(0,0%,30%)] mt-1">Sem cartão necessário</p>
            </div>
          </div>
        </div>

        {/* Card Barbearia */}
        <div
          className="bg-[hsl(0,0%,100%,0.04)] backdrop-blur-sm border border-[hsl(0,0%,100%,0.08)] rounded-2xl p-6 md:px-8 md:py-7 cursor-pointer transition-all duration-200 hover:border-[hsl(45,93%,58%,0.35)] hover:bg-[hsl(0,0%,100%,0.06)]"
          onClick={() => navigate('/login/barbershop')}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] md:text-base font-semibold text-[hsl(0,0%,88%)] mb-4">
                Sou Barbearia
              </h2>
              <ul className="space-y-2 text-[13px] font-light text-[hsl(0,0%,50%)] leading-relaxed">
                <li>· Gestão de agenda online</li>
                <li>· Controle de profissionais</li>
                <li>· Relatórios e estatísticas</li>
                <li>· Gestão de clientes e fidelidade</li>
              </ul>
              <p className="text-[10px] font-light text-[hsl(0,0%,30%)] mt-2.5">
                (agenda + relatórios + equipe completa)
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-5xl md:text-6xl font-bold text-[hsl(0,0%,96%)] leading-none tracking-tight">
                30 dias
              </p>
              <p className="text-[11px] font-light text-[hsl(145,55%,48%)] mt-3">Grátis para testar</p>
              <p className="text-[10px] font-light text-[hsl(0,0%,30%)] mt-1.5 leading-relaxed">
                Sem compromisso<br />Cancele quando quiser
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full max-w-[700px] mt-8 grid grid-cols-2 gap-4">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/85 rounded-xl h-11 font-medium text-sm"
          onClick={() => navigate('/login/client')}
        >
          Entrar como Cliente
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/85 rounded-xl h-11 font-medium text-sm"
          onClick={() => navigate('/login/barbershop')}
        >
          Entrar como Barbearia
        </Button>
      </div>

      {/* Back */}
      <div className="mt-8">
        <Button
          variant="ghost"
          className="text-[hsl(0,0%,30%)] hover:text-[hsl(0,0%,65%)] hover:bg-transparent text-xs font-light"
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
