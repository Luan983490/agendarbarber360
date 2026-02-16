import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User, Store, Check, ArrowLeft, Calendar, Clock, Star, BarChart3, Users, Gift } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

const ChooseUserType = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,4%)] flex flex-col items-center justify-center p-4 md:p-8">
      {/* Large elegant header */}
      <div className="text-center mb-12 md:mb-16 max-w-3xl">
        <img src={b360Logo} alt="Barber360" className="h-10 mx-auto mb-8 opacity-80" />
        <p className="text-[hsl(0,0%,50%)] uppercase tracking-[0.3em] text-xs mb-4">
          Bem-vindo ao
        </p>
        <h1 className="text-5xl md:text-7xl font-bold text-[hsl(0,0%,95%)] leading-tight tracking-tight">
          Barber
          <span className="font-light italic text-[hsl(0,0%,70%)]">360</span>
        </h1>
        <p className="text-[hsl(0,0%,45%)] text-base md:text-lg mt-4">
          Escolha como você deseja continuar
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 gap-5 md:gap-6 w-full max-w-4xl">
        {/* Card Cliente */}
        <div
          className="group relative bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,18%)] rounded-2xl p-6 md:p-8 cursor-pointer transition-all duration-300 hover:border-[hsl(210,80%,55%)] hover:bg-[hsl(0,0%,11%)]"
          onClick={() => navigate('/login/client')}
        >
          {/* Title row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-[hsl(210,80%,55%,0.12)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[hsl(210,80%,60%)]" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[hsl(0,0%,95%)]">
                  Sou Cliente
                </h2>
              </div>
            </div>
            <span className="text-[hsl(0,0%,35%)] text-xs uppercase tracking-wider mt-2">Grátis</span>
          </div>

          <p className="text-[hsl(0,0%,50%)] text-sm mb-6 leading-relaxed">
            Agende cortes de cabelo e barba nas melhores barbearias da região
          </p>

          {/* Feature list */}
          <ul className="space-y-3 text-sm mb-8">
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <Calendar className="w-4 h-4 text-[hsl(210,80%,60%)] shrink-0" strokeWidth={1.5} />
              Agendar online 24/7
            </li>
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <Clock className="w-4 h-4 text-[hsl(210,80%,60%)] shrink-0" strokeWidth={1.5} />
              Ver horários disponíveis
            </li>
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <Star className="w-4 h-4 text-[hsl(210,80%,60%)] shrink-0" strokeWidth={1.5} />
              Avaliar e favoritar barbearias
            </li>
          </ul>

          <Button className="w-full bg-[hsl(210,80%,55%)] hover:bg-[hsl(210,80%,48%)] text-white rounded-xl h-11 font-medium">
            Continuar como Cliente
          </Button>
        </div>

        {/* Card Barbearia */}
        <div
          className="group relative bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,18%)] rounded-2xl p-6 md:p-8 cursor-pointer transition-all duration-300 hover:border-[hsl(270,60%,55%)] hover:bg-[hsl(0,0%,11%)]"
          onClick={() => navigate('/login/barbershop')}
        >
          {/* Title row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-[hsl(270,60%,55%,0.12)] flex items-center justify-center">
                  <Store className="w-5 h-5 text-[hsl(270,60%,65%)]" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[hsl(0,0%,95%)]">
                  Sou Barbearia
                </h2>
              </div>
            </div>
            <span className="text-[hsl(145,60%,45%)] text-xs uppercase tracking-wider mt-2 font-medium">
              30 dias grátis
            </span>
          </div>

          <p className="text-[hsl(0,0%,50%)] text-sm mb-6 leading-relaxed">
            Gerencie sua barbearia e receba agendamentos online
          </p>

          {/* Feature list */}
          <ul className="space-y-3 text-sm mb-8">
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <Calendar className="w-4 h-4 text-[hsl(270,60%,65%)] shrink-0" strokeWidth={1.5} />
              Gestão de agenda online
            </li>
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <Users className="w-4 h-4 text-[hsl(270,60%,65%)] shrink-0" strokeWidth={1.5} />
              Controle de profissionais
            </li>
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <BarChart3 className="w-4 h-4 text-[hsl(270,60%,65%)] shrink-0" strokeWidth={1.5} />
              Relatórios e estatísticas
            </li>
            <li className="flex items-center gap-3 text-[hsl(0,0%,72%)]">
              <Gift className="w-4 h-4 text-[hsl(270,60%,65%)] shrink-0" strokeWidth={1.5} />
              Programa de fidelidade
            </li>
          </ul>

          <Button className="w-full bg-[hsl(270,60%,50%)] hover:bg-[hsl(270,60%,43%)] text-white rounded-xl h-11 font-medium">
            Continuar como Barbearia
          </Button>
        </div>
      </div>

      {/* Back */}
      <div className="mt-10">
        <Button
          variant="ghost"
          className="text-[hsl(0,0%,40%)] hover:text-[hsl(0,0%,80%)] hover:bg-transparent text-sm"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o início
        </Button>
      </div>
    </div>
  );
};

export default ChooseUserType;
