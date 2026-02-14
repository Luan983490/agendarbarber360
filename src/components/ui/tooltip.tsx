import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

// Detect touch device
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}

// On touch devices, render children directly without tooltip wrapper
const Tooltip = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) => {
  const isTouch = useIsTouchDevice();
  if (isTouch) {
    return <>{children}</>;
  }
  return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>;
};

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ children, asChild, ...props }, ref) => {
  const isTouch = useIsTouchDevice();
  if (isTouch) {
    // On touch, just render children directly without the trigger wrapper
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return <>{children}</>;
  }
  return (
    <TooltipPrimitive.Trigger ref={ref} asChild={asChild} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const isTouch = useIsTouchDevice();
  if (isTouch) return null;
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
