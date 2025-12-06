import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactElement,
  cloneElement,
  ReactNode,
} from "react";

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

type CollapsibleProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
};

export function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CollapsibleContext.Provider value={value}>
      <div data-state={open ? "open" : "closed"} className={className}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

type TriggerProps = {
  children: ReactElement;
  className?: string;
};

export function CollapsibleTrigger({ children, className }: TriggerProps) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleTrigger must be used within Collapsible");

  const handleClick = (event: any) => {
    children.props.onClick?.(event);
    if (!event.defaultPrevented) {
      ctx.setOpen(!ctx.open);
    }
  };

  return cloneElement(children, {
    className: [children.props.className, className].filter(Boolean).join(" "),
    onClick: handleClick,
    "data-state": ctx.open ? "open" : "closed",
  });
}

type ContentProps = {
  children: ReactNode;
  className?: string;
};

export function CollapsibleContent({ children, className }: ContentProps) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleContent must be used within Collapsible");
  if (!ctx.open) return null;
  return (
    <div className={className} data-state="open">
      {children}
    </div>
  );
}

