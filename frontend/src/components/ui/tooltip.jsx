import * as React from "react";
import * as TooltipPrimitive from "radix-ui";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Tooltip.Provider;

const Tooltip = TooltipPrimitive.Tooltip.Root;

const TooltipTrigger = TooltipPrimitive.Tooltip.Trigger;

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Tooltip.Portal>
      <TooltipPrimitive.Tooltip.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-[var(--radix-tooltip-content-available-width)] rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Tooltip.Portal>
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
