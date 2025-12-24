import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, User, Settings, LogOut, Calendar, Store, History, Package, CreditCard, Heart, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import barber360Logo from "@/assets/barber360-logo.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { role } = useUserAccess();
  const navigate = useNavigate();

  const handleDashboard = () => {
    if (role === 'owner') {
      navigate('/dashboard');
    } else if (role === 'barber') {
      navigate('/barber/hoje');
    } else if (role === 'attendant') {
      navigate('/attendant-dashboard');
    } else {
      navigate('/my-bookings');
    }
  };
  return <div className="w-full">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={barber360Logo} alt="Barber360" className="h-10 w-10" />
              
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
                    {role === 'owner' ? (
                      <DropdownMenuItem onClick={handleDashboard}>
                        <Store className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                    ) : role === 'barber' ? (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/barber/hoje')}>
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>Hoje</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/barber/agenda')}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          <span>Minha Agenda</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={handleDashboard}>
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>Meus Agendamentos</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/historico')}>
                          <History className="mr-2 h-4 w-4" />
                          <span>Histórico</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/pacotes')}>
                          <Package className="mr-2 h-4 w-4" />
                          <span>Meus Pacotes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/assinaturas')}>
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>Minhas Assinaturas</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/cartoes')}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          <span>Meus Cartões</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/favoritos')}>
                          <Heart className="mr-2 h-4 w-4" />
                          <span>Favoritos</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {role !== 'barber' && (
                      <DropdownMenuItem onClick={() => navigate('/perfil')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
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
                        {role === 'owner' ? (
                          <Button variant="outline" onClick={handleDashboard}>
                            Dashboard
                          </Button>
                        ) : role === 'barber' ? (
                          <>
                            <Button variant="outline" onClick={() => navigate('/barber/hoje')}>
                              Hoje
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/barber/agenda')}>
                              Minha Agenda
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" onClick={handleDashboard}>
                            Meus Agendamentos
                          </Button>
                        )}

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
    </div>;
};