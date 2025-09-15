import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, DollarSign, Scissors, X } from "lucide-react";

interface SearchFiltersProps {
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

const filters = [
  { id: "open_now", label: "Aberto agora", icon: Clock },
  { id: "highly_rated", label: "Mais bem avaliado", icon: Star },
  { id: "best_price", label: "Melhor preço", icon: DollarSign },
  { id: "premium_services", label: "Serviços premium", icon: Scissors },
];

export const SearchFilters = ({ activeFilters, onFiltersChange }: SearchFiltersProps) => {
  const toggleFilter = (filterId: string) => {
    const isActive = activeFilters.includes(filterId);
    if (isActive) {
      onFiltersChange(activeFilters.filter(id => id !== filterId));
    } else {
      onFiltersChange([...activeFilters, filterId]);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground mb-2 sm:mb-0">
          Filtros rápidos
        </h3>
        
        {activeFilters.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground self-start sm:self-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter.id);
          const Icon = filter.icon;
          
          return (
            <Button
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFilter(filter.id)}
              className={
                isActive
                  ? "bg-gradient-primary text-primary-foreground border-primary hover:opacity-90"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
              }
            >
              <Icon className="mr-2 h-4 w-4" />
              {filter.label}
            </Button>
          );
        })}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map((filterId) => {
            const filter = filters.find(f => f.id === filterId);
            if (!filter) return null;
            
            return (
              <Badge 
                key={filterId}
                variant="secondary" 
                className="bg-accent text-accent-foreground"
              >
                {filter.label}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFilter(filterId)}
                  className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};