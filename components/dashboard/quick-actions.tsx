"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, DollarSign, Wallet, CheckSquare, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskForm } from "@/components/tasks/task-form";
import { ShoppingListForm } from "@/components/shopping/shopping-list-form";

export function QuickActions() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isShoppingListDialogOpen, setIsShoppingListDialogOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [trips, setTrips] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTaskData, setIsLoadingTaskData] = useState(false);

  const actions = [
    {
      label: "Add Expense",
      icon: DollarSign,
      href: "/dashboard/expenses/new",
      color: "text-green-600 dark:text-green-400",
      onClick: () => router.push("/dashboard/expenses/new"),
    },
    {
      label: "Add Cash",
      icon: Wallet,
      href: "/dashboard/cash",
      color: "text-blue-600 dark:text-blue-400",
      onClick: () => router.push("/dashboard/cash"),
    },
    {
      label: "Add Task",
      icon: CheckSquare,
      href: "/dashboard/tasks",
      color: "text-purple-600 dark:text-purple-400",
      onClick: async () => {
        setIsHovered(false);
        setIsTaskDialogOpen(true);
        await fetchTaskData();
      },
    },
    {
      label: "Add Shopping List",
      icon: ShoppingCart,
      href: "/dashboard/shopping",
      color: "text-orange-600 dark:text-orange-400",
      onClick: () => {
        setIsHovered(false);
        setIsShoppingListDialogOpen(true);
      },
    },
  ];

  const fetchTaskData = async () => {
    if (isLoadingTaskData || (users.length > 0 && trips.length > 0)) return;
    
    setIsLoadingTaskData(true);
    try {
      const [usersRes, tripsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/trips"),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Handle both array and object with data property
        const usersArray = Array.isArray(usersData) ? usersData : (usersData?.data || []);
        setUsers(usersArray);
      }

      if (tripsRes.ok) {
        const tripsResponse = await tripsRes.json();
        // API returns { data: trips[], pagination: {...} }
        const tripsData = tripsResponse?.data || tripsResponse;
        // Ensure it's an array before mapping
        const tripsArray = Array.isArray(tripsData) ? tripsData : [];
        // Map to only id and name
        const mappedTrips = tripsArray.map((trip: { id: string; name: string }) => ({
          id: trip.id,
          name: trip.name,
        }));
        setTrips(mappedTrips);
      }
    } catch (error) {
      console.error("Error fetching task data:", error);
    } finally {
      setIsLoadingTaskData(false);
    }
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant="outline"
        size="sm"
        className="relative z-10 transition-all duration-200 hover:scale-105"
        aria-label="Quick actions menu"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New
      </Button>

      {/* Dropdown Menu */}
      <div
        className={cn(
          "absolute left-0 top-full pt-2 w-48 z-20 transition-all duration-300 ease-out",
          isHovered
            ? "opacity-100 translate-y-0 pointer-events-auto visible"
            : "opacity-0 -translate-y-2 pointer-events-none invisible"
        )}
      >
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="py-1">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={`${action.label}-${index}`}
                onClick={action.onClick}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left text-slate-900 hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:translate-x-1",
                  isHovered && "animate-in fade-in slide-in-from-top-2"
                )}
                style={{
                  animationDelay: isHovered ? `${index * 50}ms` : "0ms",
                }}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", action.color)} />
                <span className="text-sm font-medium">
                  {action.label}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 sm:pb-2">
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          {isLoadingTaskData ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <TaskForm
              users={users}
              trips={trips}
              onSuccess={() => {
                setIsTaskDialogOpen(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Shopping List Dialog */}
      <Dialog open={isShoppingListDialogOpen} onOpenChange={setIsShoppingListDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Shopping List</DialogTitle>
            <DialogDescription>Create a new shopping list</DialogDescription>
          </DialogHeader>
          <ShoppingListForm
            onSuccess={() => {
              setIsShoppingListDialogOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

