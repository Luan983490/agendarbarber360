import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Star, UserCheck } from "lucide-react";

interface HowItWorksProps {
  children: React.ReactNode;
}

export const HowItWorks = ({ children }: HowItWorksProps) => {
  const steps = [
    {
      icon: Search,
      title: "Encontre sua barbearia",
      description: "Use nossa busca por localização para encontrar as melhores barbearias próximas a você."
    },
    {
      icon: Calendar,
      title: "Agende seu horário", 
      description: "Escolha o serviço, profissional e horário que melhor se adapta à sua agenda."
    },
    {
      icon: UserCheck,
      title: "Compareça no horário",
      description: "Receba confirmação por WhatsApp e notificações para não esquecer do seu agendamento."
    },
    {
      icon: Star,
      title: "Avalie a experiência",
      description: "Ajude outros usuários compartilhando sua experiência e ganhando pontos de fidelidade."
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Como funciona o BarberBook</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center pt-4">
          <Button variant="gradient">
            Começar agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};