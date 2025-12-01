import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  showIcon?: boolean;
  className?: string;
}

const variantStyles = {
  default: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  default: Clock,
  info: Clock,
};

export function StatusBadge({ 
  status, 
  variant = "default", 
  showIcon = false,
  className 
}: StatusBadgeProps) {
  const Icon = showIcon ? icons[variant] : null;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
        variantStyles[variant],
        className
      )}
    >
      {Icon && <Icon size={12} />}
      {status}
    </span>
  );
}

