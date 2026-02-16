import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, User, Settings, LogOut, Calendar, Store, History, Package, CreditCard, Heart, CalendarDays, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import b360Logo from "@/assets/b360-logo.png";

interface HeaderProps {
  showBackButton?: boolean;
  hideMobileMenu?: boolean;
}

export const Header = ({ showBackButton = false, hideMobileMenu = false }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { role } = useUserAccess();
  const navigate = useNavigate();

  const handleDashboard = () => {
    if (role === 'owner') {
      navigate('/dashboard');
    } else if (role === 'barber') {
      navigate('/barber/hoje');
    } else if (role === 'attendant') {
      navigate('/attendant/dashboard');
    } else {
      navigate('/my-bookings');
    }
  };

  const handleBack = () => {
    if (role === 'owner') {
      navigate('/dashboard');
    } else if (role === 'barber') {
      navigate('/barber/hoje');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white border-b border-gray-800" style={{ backgroundColor: '#000000' }}>
        <div className="w-full px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left side - Back button or Logo */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {showBackButton && user && (role === 'owner' || role === 'barber') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              )}

              <Link to="/" className="flex items-center">
                <img src={b360Logo} alt="B360" className="h-10 sm:h-12" />
              </Link>
            </div>

            {/* Desktop Navigation - Hidden for logged in owners/barbers */}
            {(!user || (role !== 'owner' && role !== 'barber')) && (
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/" className="text-sm text-foreground hover:text-primary transition-colors">
                  Início
                </Link>
                <button
                  onClick={() => {
                    navigate('/');
                    setTimeout(() => {
                      const input = document.getElementById('search-barbershop-input');
                      if (input) input.focus();
                    }, 100);
                  }}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  Buscar
                </button>
                <Link to="/my-bookings" className="text-sm text-foreground hover:text-primary transition-colors">
                  Agendamentos
                </Link>
              </nav>
            )}

            {/* Right side - User actions */}
            <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
                <>
                  {/* Hide avatar dropdown on mobile when bottom nav is active */}
                  <div className={hideMobileMenu ? 'hidden md:block' : ''}>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                            <AvatarFallback className="text-xs sm:text-sm bg-primary text-primary-foreground">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 bg-popover" align="end" forceMount>
                        <div className="px-2 py-1.5 text-xs sm:text-sm">
                          <p className="font-medium truncate">{user.email?.split('@')[0] || 'Usuário'}</p>
                          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                        </div>
                        <DropdownMenuSeparator />
                        
                        {role === 'owner' ? (
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onSelect={(e) => {
                              e.preventDefault();
                              handleDashboard();
                            }}
                          >
                            <Store className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            <span>Dashboard</span>
                          </DropdownMenuItem>
                        ) : role === 'barber' ? (
                          <>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                navigate('/barber/hoje');
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
                              <span>Hoje</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                navigate('/barber/agenda');
                              }}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" strokeWidth={1.5} />
                              <span>Minha Agenda</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                handleDashboard();
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
                              <span>Meus Agendamentos</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                navigate('/pacotes');
                              }}
                            >
                              <Package className="mr-2 h-4 w-4" strokeWidth={1.5} />
                              <span>Meus Pacotes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                navigate('/favoritos');
                              }}
                            >
                              <Heart className="mr-2 h-4 w-4" strokeWidth={1.5} />
                              <span>Favoritos</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onSelect={(e) => {
                            e.preventDefault();
                            navigate('/perfil');
                          }}
                        >
                          <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          <span>Perfil</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onSelect={(e) => {
                            e.preventDefault();
                            navigate('/perfil?tab=security');
                          }}
                        >
                          <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          <span>Configurações</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            signOut();
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          <span>Sair</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/choose-type">
                    <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/choose-type" className="hidden sm:block">
                    <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                      Cadastrar-se
                    </Button>
                  </Link>
                </>
              )}

              {/* Mobile Menu - Only for non-logged or clients, hidden when bottom nav is active */}
              {!hideMobileMenu && (!user || (role !== 'owner' && role !== 'barber')) && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 sm:h-9 sm:w-9">
                      <Menu className="h-5 w-5" strokeWidth={1.5} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <div className="flex flex-col gap-4 mt-8">
                      <a href="#" className="text-foreground hover:text-primary transition-colors">
                        Encontrar Barbearias
                      </a>
                      <Link to="/login/barbershop" className="text-foreground hover:text-primary transition-colors">
                        Área da Barbearia
                      </Link>
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
                            <Link to="/choose-type">
                              <Button variant="outline" className="w-full">Entrar</Button>
                            </Link>
                            <Link to="/choose-type">
                              <Button className="w-full">Cadastrar-se</Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
