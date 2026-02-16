import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Store, Check, ArrowLeft } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

const ChooseUserType = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <img src={b360Logo} alt="B360" className="h-14 mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Bem-vindo ao Barber360
          </h1>
          <p className="text-slate-400 text-lg">
            Escolha como você deseja continuar
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Card Cliente */}
          <Card
            className="bg-slate-800/50 border-slate-700 hover:border-blue-500 transition-all duration-300 cursor-pointer p-6 md:p-8 group"
            onClick={() => navigate('/login/client')}
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <User className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Sou Cliente</h2>
              <p className="text-slate-400 mb-6">
                Quero agendar cortes de cabelo e barba nas melhores barbearias da região
              </p>
              <ul className="text-left space-y-2.5 text-sm text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  Agendar online 24/7
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  Ver horários disponíveis
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  Avaliar e favoritar barbearias
                </li>
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full">
                Continuar como Cliente
              </Button>
            </div>
          </Card>

          {/* Card Barbearia */}
          <Card
            className="bg-slate-800/50 border-slate-700 hover:border-purple-500 transition-all duration-300 cursor-pointer p-6 md:p-8 group"
            onClick={() => navigate('/login/barbershop')}
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Store className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Sou Barbearia</h2>
              <p className="text-slate-400 mb-6">
                Quero gerenciar minha barbearia e receber agendamentos online
              </p>
              <ul className="text-left space-y-2.5 text-sm text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  Gestão de agenda online
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  Controle de profissionais
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  Relatórios e estatísticas
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  30 dias grátis
                </li>
              </ul>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full">
                Continuar como Barbearia
              </Button>
            </div>
          </Card>
        </div>

        {/* Back */}
        <div className="text-center mt-8">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChooseUserType;
