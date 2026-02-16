import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUpRight } from 'lucide-react';

const ChooseUserType = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,7%)] flex items-center justify-center px-4 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[640px]">
        {/* Card Cliente */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 min-h-[180px] flex flex-col justify-between cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 25%, 18%) 0%, hsl(220, 30%, 12%) 100%)',
          }}
          onClick={() => navigate('/login/client')}
        >
          <div>
            <h2 className="text-[22px] md:text-[26px] font-bold text-white leading-tight tracking-tight">
              Sou<br />Cliente
            </h2>
            <p className="text-[13px] font-light text-white/50 mt-2">
              Quero fazer agendamentos
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <ArrowUpRight className="h-4 w-4 text-white/70" />
            <span className="text-[12px] font-medium text-white/70 tracking-wide uppercase">
              Entrar
            </span>
          </div>
        </div>

        {/* Card Barbearia */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 min-h-[180px] flex flex-col justify-between cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, hsl(45, 60%, 28%) 0%, hsl(35, 40%, 14%) 100%)',
          }}
          onClick={() => navigate('/login/barbershop')}
        >
          <div>
            <h2 className="text-[22px] md:text-[26px] font-bold text-white leading-tight tracking-tight">
              Tenho uma<br />Barbearia
            </h2>
            <p className="text-[13px] font-light text-white/50 mt-2">
              Sou barbeiro
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <ArrowUpRight className="h-4 w-4 text-white/70" />
            <span className="text-[12px] font-medium text-white/70 tracking-wide uppercase">
              Entrar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChooseUserType;
