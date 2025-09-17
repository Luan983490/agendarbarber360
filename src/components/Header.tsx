import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Menu, User, Bell, X } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar lógica de cadastro
    setIsSignupOpen(false);
  };

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

          <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="hover:opacity-90 transition-opacity">
                Cadastrar-se
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar sua conta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" type="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" type="tel" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" required />
                </div>
                <Button type="submit" variant="gradient" className="w-full">
                  Criar conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4 mt-6">
                <Button variant="ghost" className="justify-start">
                  Encontrar Barbearias
                </Button>
                <Button variant="ghost" className="justify-start">
                  Para Empresas
                </Button>
                <Button variant="ghost" className="justify-start">
                  Ajuda
                </Button>
                <div className="border-t pt-4 mt-4">
                  <Button variant="ghost" className="justify-start w-full mb-2">
                    <User className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                  <Button variant="gradient" className="w-full" onClick={() => setIsSignupOpen(true)}>
                    Cadastrar-se
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};