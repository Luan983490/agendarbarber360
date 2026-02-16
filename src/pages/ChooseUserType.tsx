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
    <div className="min-h-screen bg-[hsl(0,0%,4%)] flex flex-col items-center justify-center px-4 py-12 md:py-16">
      {/* Header */}
      <div className="text-center mb-14 md:mb-20">
        <img src={b360Logo} alt="Barber360" className="h-9 mx-auto mb-10 opacity-70" />
        <p className="text-[hsl(0,0%,50%)] uppercase tracking-[0.35em] text-[11px] mb-3">
          Bem-vindo ao
        </p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[hsl(0,0%,96%)] leading-none tracking-tight">
          Barber
          <span className="font-light italic text-[hsl(0,0%,60%)]">360</span>
        </h1>
      </div>

      {/* Cards */}
      <div className="w-full max-w-3xl space-y-5">
        {/* Card Cliente */}
        <div
          className="group bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,16%)] rounded-2xl px-6 py-6 md:px-8 md:py-7 cursor-pointer transition-all duration-300 hover:border-[hsl(210,70%,50%)]"
          onClick={() => navigate('/login/client')}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Left */}
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-[hsl(0,0%,93%)] mb-4">
                Sou Cliente
              </h2>
              <ul className="space-y-2 text-[13px] text-[hsl(0,0%,58%)]">
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Agendar online 24/7
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Ver horários disponíveis em tempo real
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Avaliar e favoritar barbearias
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Programa de fidelidade
                </li>
              </ul>
            </div>

            {/* Right */}
            <div className="text-left md:text-right md:min-w-[160px] flex flex-col items-start md:items-end">
              <span className="text-4xl md:text-5xl font-bold text-[hsl(0,0%,96%)] leading-none">
                Grátis
              </span>
              <span className="text-[11px] text-[hsl(0,0%,45%)] mt-2 uppercase tracking-wide">
                Para sempre
              </span>
              <span className="text-[11px] text-[hsl(0,0%,38%)] mt-3 leading-relaxed">
                Sem cartão de crédito
              </span>
              <Button
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/85 rounded-lg h-9 px-5 text-xs font-medium"
              >
                Continuar →
              </Button>
            </div>
          </div>
        </div>

        {/* Card Barbearia */}
        <div
          className="group bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,16%)] rounded-2xl px-6 py-6 md:px-8 md:py-7 cursor-pointer transition-all duration-300 hover:border-[hsl(270,55%,55%)]"
          onClick={() => navigate('/login/barbershop')}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Left */}
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-[hsl(0,0%,93%)] mb-4">
                Sou Barbearia
              </h2>
              <ul className="space-y-2 text-[13px] text-[hsl(0,0%,58%)]">
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Gestão de agenda online
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Controle de profissionais
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Relatórios e estatísticas
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[hsl(0,0%,40%)] mt-0.5">·</span>
                  Gestão de clientes e fidelidade
                </li>
                <li className="flex items-start gap-2.5 text-[11px] text-[hsl(0,0%,40%)]">
                  <span className="mt-0.5"> </span>
                  (agenda + relatórios + equipe completa)
                </li>
              </ul>
            </div>

            {/* Right */}
            <div className="text-left md:text-right md:min-w-[180px] flex flex-col items-start md:items-end">
              <span className="text-4xl md:text-5xl font-bold text-[hsl(0,0%,96%)] leading-none">
                30 dias
              </span>
              <span className="text-[11px] text-[hsl(145,55%,48%)] mt-2 uppercase tracking-wide font-medium">
                Grátis para testar
              </span>
              <span className="text-[11px] text-[hsl(0,0%,38%)] mt-3 leading-relaxed">
                Sem compromisso<br />
                Cancele quando quiser
              </span>
              <Button
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/85 rounded-lg h-9 px-5 text-xs font-medium"
              >
                Continuar →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Back */}
      <div className="mt-12">
        <Button
          variant="ghost"
          className="text-[hsl(0,0%,38%)] hover:text-[hsl(0,0%,75%)] hover:bg-transparent text-xs"
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
