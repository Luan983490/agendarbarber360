import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { HowItWorks } from "./HowItWorks";
import heroImage from "@/assets/barbershop-hero.jpg";

export const Hero = () => {
  return (
    <section className="relative py-20 px-4 bg-gradient-dark overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Encontre a 
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Barbearia Perfeita</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Agende serviços nas melhores barbearias da sua região. Rápido, fácil e sem complicações.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              variant="gradient" 
              size="lg"
              onClick={() => {
                // Scroll para a seção de busca
                const searchSection = document.querySelector('.location-search');
                searchSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <MapPin className="mr-2 h-5 w-5" />
              Encontrar Próximo a Mim
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <HowItWorks>
              <Button variant="elegant" size="lg">
                Como Funciona
              </Button>
            </HowItWorks>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <p className="text-muted-foreground">Barbearias Parceiras</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">50k+</div>
              <p className="text-muted-foreground">Agendamentos Realizados</p>
            </div>
            <div className="text-center flex items-center justify-center">
              <Star className="h-6 w-6 text-primary mr-2 fill-current" />
              <div className="text-3xl font-bold text-primary mr-1">4.9</div>
              <p className="text-muted-foreground">Avaliação Média</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};