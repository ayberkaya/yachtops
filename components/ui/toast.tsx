"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
  onClose?: () => void;
}

export function Toast({ id, title, description, variant = "default", duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const variantConfig = {
    default: {
      container: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
      icon: "text-slate-600 dark:text-slate-400",
      iconComponent: Info,
    },
    success: {
      container: "bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-700 text-white",
      icon: "text-white",
      iconComponent: CheckCircle2,
    },
    error: {
      container: "bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-700 text-white",
      icon: "text-white",
      iconComponent: AlertCircle,
    },
    warning: {
      container: "bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-700 text-white",
      icon: "text-white",
      iconComponent: AlertTriangle,
    },
  };

  const config = variantConfig[variant];
  const IconComponent = config.iconComponent;

  return (
    <div
      className={cn(
        "relative flex w-full items-start gap-3 rounded-xl border-2 p-4 shadow-xl backdrop-blur-sm transition-all",
        "min-h-[64px]",
        config.container,
        isVisible ? "animate-in slide-in-from-top-5 fade-in-0" : "animate-out slide-out-to-top-5 fade-out-0"
      )}
      role="alert"
    >
      <IconComponent className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.icon)} />
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold text-base leading-tight mb-1">{title}</div>
        )}
        <div className={cn("text-sm leading-relaxed", title ? "" : "text-base")}>
          {description}
        </div>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className={cn(
          "rounded-lg p-1.5 flex-shrink-0 transition-colors",
          variant === "default"
            ? "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            : "hover:bg-black/20 text-white/80 hover:text-white"
        )}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastProps[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

let toastIdCounter = 0;
const toastListeners = new Set<(toasts: ToastProps[]) => void>();
let toasts: ToastProps[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(props: Omit<ToastProps, "id">) {
  const id = `toast-${++toastIdCounter}`;
  const newToast: ToastProps = { ...props, id };
  
  toasts = [...toasts, newToast];
  notifyListeners();

  return id;
}

export function useToast() {
  const [toastList, setToastList] = React.useState<ToastProps[]>([]);

  React.useEffect(() => {
    const listener = (newToasts: ToastProps[]) => {
      setToastList(newToasts);
    };
    
    toastListeners.add(listener);
    setToastList([...toasts]);

    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = React.useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  const showToast = React.useCallback((props: Omit<ToastProps, "id">) => {
    return toast(props);
  }, []);

  return {
    toasts: toastList,
    toast: showToast,
    removeToast,
  };
}

