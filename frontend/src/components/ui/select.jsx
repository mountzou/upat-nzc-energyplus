import * as React from "react";
import * as SelectPrimitive from "radix-ui";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Select.Root;

const SelectGroup = SelectPrimitive.Select.Group;

const SelectValue = SelectPrimitive.Select.Value;

const SelectTrigger = React.forwardRef(
  ({ className, children, leftIcon, ...props }, ref) => (
    <SelectPrimitive.Select.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <SelectPrimitive.Select.Value
        placeholder={props.placeholder}
        className={leftIcon ? "min-w-0 flex-1 truncate" : "truncate"}
      >
        {children}
      </SelectPrimitive.Select.Value>
      <SelectPrimitive.Select.Icon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground">
        ▾
      </SelectPrimitive.Select.Icon>
    </SelectPrimitive.Select.Trigger>
  )
);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef(
  ({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Select.Portal>
      <SelectPrimitive.Select.Content
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          position === "popper" &&
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Select.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Select.Viewport>
      </SelectPrimitive.Select.Content>
    </SelectPrimitive.Select.Portal>
  )
);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Select.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Select.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=checked]:font-medium",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Select.ItemText>{children}</SelectPrimitive.Select.ItemText>
    </SelectPrimitive.Select.Item>
  )
);
SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
};

