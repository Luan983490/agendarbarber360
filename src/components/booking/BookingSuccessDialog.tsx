import { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, CalendarCheck, Mail } from "lucide-react";
import confetti from "canvas-confetti";

interface BookingSuccessDialogProps {
  open: boolean;
  onContinue: () => void;
  isNewSignup?: boolean;
}

export const BookingSuccessDialog = ({ open, onContinue, isNewSignup = false }: BookingSuccessDialogProps) => {
  const hasFired = useRef(false);

  useEffect(() => {
    if (open && !hasFired.current) {
      hasFired.current = true;
      const fire = (opts: confetti.Options) =>
        confetti({
          ...opts,
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 9999,
        });

      fire({ angle: 60, origin: { x: 0.15, y: 0.6 } });
      fire({ angle: 120, origin: { x: 0.85, y: 0.6 } });

      setTimeout(() => {
        fire({ angle: 90, origin: { x: 0.5, y: 0.7 } });
      }, 300);
    }
    if (!open) {
      hasFired.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md text-center border-none shadow-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 text-2xl animate-bounce">🎉</div>
          </div>

          <div className="space-y-2 animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground">Parabéns! 🎊</h2>
            <p className="text-lg text-muted-foreground">
              Seu agendamento foi realizado com sucesso!
            </p>
            <p className="text-sm text-muted-foreground">
              Você receberá uma confirmação em breve.
            </p>
          </div>

          {isNewSignup && (
            <Alert className="border-primary/30 bg-primary/5 text-left">
              <Mail className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-foreground">
                <strong>Importante:</strong> Para acessar o sistema e gerenciar seus agendamentos, confirme seu e-mail clicando no link que enviamos para sua caixa de entrada.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={onContinue}
            className="w-full mt-2 gap-2"
            size="lg"
          >
            <CalendarCheck className="w-5 h-5" />
            {isNewSignup ? "Entendi" : "Ver meus agendamentos"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
