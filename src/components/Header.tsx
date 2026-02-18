import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, User, Settings, LogOut, Calendar, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import b360Logo from "@/assets/b360-logo.png";

interface HeaderProps {
  showBackButton?: boolean;
  hideMobileMenu?: boolean;
}

export const Header = ({ showBackButton = false, hideMobileMenu = false }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white border-b border-gray-800" style={{ backgroundColor: '#000000', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="w-full px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left side - Logo */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link to="/" className="flex items-center">
                <img src={b360Logo} alt="B360" className="h-10 sm:h-12" />
              </Link>
            </div>

            {/* Desktop Navigation */}
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
              {user && (
                <Link to="/my-bookings" className="text-sm text-foreground hover:text-primary transition-colors">
                  Agendamentos
                </Link>
              )}
            </nav>

            {/* Right side - User actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {user ? (
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
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onSelect={(e) => { e.preventDefault(); navigate('/my-bookings'); }}
                      >
                        <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>Meus Agendamentos</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onSelect={(e) => { e.preventDefault(); navigate('/favoritos'); }}
                      >
                        <Heart className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>Favoritos</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onSelect={(e) => { e.preventDefault(); navigate('/perfil'); }}
                      >
                        <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>Perfil</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onSelect={(e) => { e.preventDefault(); navigate('/perfil?tab=security'); }}
                      >
                        <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>Configurações</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onSelect={(e) => { e.preventDefault(); signOut(); }}
                      >
                        <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/signup" className="hidden sm:block">
                    <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                      Cadastrar-se
                    </Button>
                  </Link>
                </>
              )}

              {/* Mobile Menu */}
              {!hideMobileMenu && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 sm:h-9 sm:w-9">
                      <Menu className="h-5 w-5" strokeWidth={1.5} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <div className="flex flex-col gap-4 mt-8">
                      <Link to="/" className="text-foreground hover:text-primary transition-colors">
                        Encontrar Barbearias
                      </Link>
                      <a href="#" className="text-foreground hover:text-primary transition-colors">
                        Ajuda
                      </a>
                      <div className="flex flex-col gap-3 mt-6">
                        {user ? (
                          <>
                            <Button variant="outline" onClick={() => navigate('/my-bookings')}>
                              Meus Agendamentos
                            </Button>
                            <Button variant="outline" onClick={signOut}>
                              Sair
                            </Button>
                          </>
                        ) : (
                          <>
                            <Link to="/login">
                              <Button variant="outline" className="w-full">Entrar</Button>
                            </Link>
                            <Link to="/signup">
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
