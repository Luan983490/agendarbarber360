import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Menu, User, Bell } from "lucide-react";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">B</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">BarberBook</h1>
        </div>

        {/* Navigation - Hidden on mobile */}
        <nav className="hidden md:flex items-center space-x-6">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Encontrar Barbearias
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Para Empresas
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Ajuda
          </Button>
        </nav>

        {/* User Actions */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" className="hidden md:flex">
            <User className="h-4 w-4 mr-2" />
            Entrar
          </Button>

          <Button variant="gradient" className="hover:opacity-90 transition-opacity">
            Cadastrar-se
          </Button>

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};