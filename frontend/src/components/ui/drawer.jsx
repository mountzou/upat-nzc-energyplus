import * as React from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const DrawerContext = React.createContext(null);

function Drawer({ open, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const resolvedOpen = open ?? internalOpen;
  const resolvedOnOpenChange = onOpenChange ?? setInternalOpen;

  return (
    <DrawerContext.Provider
      value={{ open: resolvedOpen, onOpenChange: resolvedOnOpenChange }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

function useDrawer() {
  const context = React.useContext(DrawerContext);

  if (!context) {
    throw new Error("Drawer components must be used within <Drawer />");
  }

  return context;
}

function DrawerTrigger({ asChild = false, children, ...props }) {
  const { onOpenChange } = useDrawer();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (event) => {
        children.props.onClick?.(event);
        onOpenChange(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

function DrawerPortal({ children }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

function DrawerContent({ className, children }) {
  const { open, onOpenChange } = useDrawer();

  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <DrawerPortal>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background shadow-2xl",
          className
        )}
      >
        {children}
      </div>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }) {
  return <div className={cn("text-base font-semibold", className)} {...props} />;
}

function DrawerDescription({ className, ...props }) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function DrawerBody({ className, ...props }) {
  return <div className={cn("max-h-[70vh] overflow-y-auto p-5", className)} {...props} />;
}

function DrawerClose({ className, ...props }) {
  const { onOpenChange } = useDrawer();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      <XIcon className="size-4" />
    </button>
  );
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
