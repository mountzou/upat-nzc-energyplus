import { MinusIcon, PlusIcon } from "lucide-react";
import {
  Button,
  Group,
  Input,
  Label,
  NumberField,
} from "react-aria-components";

import { cn } from "@/lib/utils";

function InputNumber({
  label,
  suffix,
  className,
  ...props
}) {
  return (
    <NumberField className={cn("w-full space-y-2.5", className)} {...props}>
      <Label className="flex items-center gap-2 text-sm leading-none font-medium select-none">
        {label}
      </Label>
      <div className="flex items-center">
        <Group className="dark:bg-input/30 border-input data-focus-within:border-ring data-focus-within:ring-ring/50 data-focus-within:has-aria-invalid:ring-destructive/20 dark:data-focus-within:has-aria-invalid:ring-destructive/40 data-focus-within:has-aria-invalid:border-destructive relative inline-flex h-8 w-full min-w-0 items-center overflow-hidden rounded-lg border bg-transparent text-base whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-focus-within:ring-[3px] md:text-sm">
          <Button
            slot="decrement"
            className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground -ms-px flex aspect-square h-[inherit] items-center justify-center rounded-l-lg border text-sm transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MinusIcon size={14} />
          </Button>
          <Input
            className={cn(
              "selection:bg-primary selection:text-primary-foreground w-full grow py-2 text-center tabular-nums outline-none",
              suffix ? "px-3 pr-10" : "px-3"
            )}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-10 text-sm text-muted-foreground">
              {suffix}
            </span>
          )}
          <Button
            slot="increment"
            className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground -me-px flex aspect-square h-[inherit] items-center justify-center rounded-r-lg border text-sm transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon size={14} />
          </Button>
        </Group>
      </div>
    </NumberField>
  );
}

export { InputNumber };
