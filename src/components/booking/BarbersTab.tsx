import { User, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  image_url?: string;
}

interface BarbersTabProps {
  barbers: Barber[];
  loading: boolean;
}

export const BarbersTab = ({ barbers, loading }: BarbersTabProps) => {
  if (loading) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Carregando barbeiros...
      </p>
    );
  }

  if (barbers.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum barbeiro cadastrado
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {barbers.map((barber) => (
        <Card key={barber.id} className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={barber.image_url} alt={barber.name} />
              <AvatarFallback className="bg-muted">
                <User className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground">{barber.name}</h4>
              {barber.specialty && (
                <p className="text-sm text-muted-foreground">{barber.specialty}</p>
              )}
              {barber.phone && (
                <div className="flex items-center gap-1 mt-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground">{barber.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
