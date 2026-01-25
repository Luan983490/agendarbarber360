import { Clock, Phone, MapPin, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BarbershopInfoTabProps {
  barbershop: {
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    opening_hours?: any;
  };
}

export const BarbershopInfoTab = ({ barbershop }: BarbershopInfoTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          {barbershop.description && (
            <div>
              <h4 className="font-medium text-foreground">Sobre</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {barbershop.description}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
            <div>
              <h4 className="font-medium text-foreground">Horário de Funcionamento</h4>
              <p className="text-sm text-muted-foreground">
                Segunda a Sexta: 9h - 18h | Sábado: 9h - 16h
              </p>
            </div>
          </div>

          {barbershop.phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-medium text-foreground">Telefone</h4>
                <p className="text-sm text-muted-foreground">{barbershop.phone}</p>
              </div>
            </div>
          )}

          {barbershop.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-medium text-foreground">Email</h4>
                <p className="text-sm text-muted-foreground">{barbershop.email}</p>
              </div>
            </div>
          )}

          {barbershop.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="font-medium text-foreground">Endereço</h4>
                <p className="text-sm text-muted-foreground">{barbershop.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
