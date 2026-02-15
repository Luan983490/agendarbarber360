import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * Detect coarse-pointer (touch) devices.
 * Cached once after first call so every render uses the same value.
 */
let _isTouch: boolean | null = null;
const isTouchDevice = () => {
  if (_isTouch === null) {
    _isTouch =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
  }
  return _isTouch;
};

/* ------------------------------------------------------------------ */
/*  Touch-safe wrappers                                                */
/*  On touch devices we completely skip Radix's Tooltip tree so that   */
/*  the first tap fires the underlying onClick immediately.            */
/* ------------------------------------------------------------------ */

const TooltipProvider: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>
> = ({ children, ...props }) => {
  if (isTouchDevice()) return <>{children}</>;
  return <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>;
};

const Tooltip: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
> = ({ children, ...props }) => {
  if (isTouchDevice()) return <>{children}</>;
  return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>;
};

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ asChild, children, ...props }, ref) => {
  if (isTouchDevice()) {
    // On touch: render the child directly (Slot if asChild, span otherwise)
    if (asChild) return <Slot ref={ref} {...props}>{children}</Slot>;
    return <button ref={ref as React.Ref<HTMLButtonElement>} {...props}>{children}</button>;
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
  if (isTouchDevice()) return null;
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
