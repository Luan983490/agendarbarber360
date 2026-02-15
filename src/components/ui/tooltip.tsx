import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

// Detect touch device to prevent tooltip from stealing first tap
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}

const TouchContext = React.createContext(false);

const Tooltip = ({ children, open: openProp, onOpenChange, ...props }: TooltipPrimitive.TooltipProps) => {
  const isTouch = useIsTouchDevice();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const handleOpenChange = React.useCallback((val: boolean) => {
    if (isTouch) return;
    if (!isControlled) setInternalOpen(val);
    onOpenChange?.(val);
  }, [isTouch, isControlled, onOpenChange]);

  return (
    <TouchContext.Provider value={isTouch}>
      <TooltipPrimitive.Root
        {...props}
        open={isTouch ? false : open}
        onOpenChange={handleOpenChange}
      >
        {children}
      </TooltipPrimitive.Root>
    </TouchContext.Provider>
  );
};

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ asChild, ...props }, ref) => {
  const isTouch = React.useContext(TouchContext);
  // On touch devices, bypass the Radix trigger entirely to avoid pointer event interception
  if (isTouch) {
    if (asChild) {
      // When asChild, just render the child directly without the trigger wrapper
      return <>{props.children}</>;
    }
    return <button ref={ref} {...props} />;
  }
  return <TooltipPrimitive.Trigger ref={ref} asChild={asChild} {...props} />;
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
