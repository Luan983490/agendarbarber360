import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Scissors, User, Settings, LogOut, Calendar, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<string>('client');

  useEffect(() => {
    if (user) {
      fetchUserType();
    }
  }, [user]);

  const fetchUserType = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user?.id)
        .single();
      
      if (data) {
        setUserType(data.user_type);
      }
    } catch (error) {
      console.error('Erro ao buscar tipo de usuário:', error);
    }
  };

  const handleDashboard = () => {
    if (userType === 'barbershop_owner') {
      navigate('/dashboard');
    } else {
      // For clients, navigate to their bookings or profile
      navigate('/');
    }
  };

  return (
    <div className="w-full">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">BarberBook</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                Encontrar Barbearias
              </a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                Para Empresas
              </a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                Ajuda
              </a>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent className="w-56" align="end" forceMount>
                     {userType === 'barbershop_owner' ? (
                       <DropdownMenuItem onClick={handleDashboard}>
                         <Store className="mr-2 h-4 w-4" />
                         <span>Dashboard</span>
                       </DropdownMenuItem>
                     ) : (
                       <DropdownMenuItem onClick={handleDashboard}>
                         <Calendar className="mr-2 h-4 w-4" />
                         <span>Meus Agendamentos</span>
                       </DropdownMenuItem>
                     )}
                     <DropdownMenuItem>
                       <Settings className="mr-2 h-4 w-4" />
                       <span>Configurações</span>
                     </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline">Entrar</Button>
                  </Link>
                  <Link to="/auth">
                    <Button>Cadastrar-se</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  <a href="#" className="text-foreground hover:text-primary transition-colors">
                    Encontrar Barbearias
                  </a>
                  <a href="#" className="text-foreground hover:text-primary transition-colors">
                    Para Empresas
                  </a>
                  <a href="#" className="text-foreground hover:text-primary transition-colors">
                    Ajuda
                  </a>
                  <div className="flex flex-col gap-3 mt-6">
                     {user ? (
                       <>
                         <Button variant="outline" onClick={handleDashboard}>
                           {userType === 'barbershop_owner' ? 'Dashboard' : 'Meus Agendamentos'}
                         </Button>
                         <Button variant="outline" onClick={signOut}>
                           Sair
                         </Button>
                       </>
                     ) : (
                      <>
                        <Link to="/auth">
                          <Button variant="outline" className="w-full">Entrar</Button>
                        </Link>
                        <Link to="/auth">
                          <Button className="w-full">Cadastrar-se</Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </div>
  );
};