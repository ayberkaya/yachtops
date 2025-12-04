"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart, Pencil, X, CheckCircle2 } from "lucide-react";
import { ShoppingListForm } from "./shopping-list-form";
import { ShoppingListDetail } from "./shopping-list-detail";
import { ShoppingListStatus } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  defaultUnit: string;
}

interface ShoppingList {
  id: string;
  name: string;
  description: string | null;
  status: ShoppingListStatus;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count: {
    items: number;
  };
  createdAt: string;
}

interface ShoppingListViewProps {
  initialLists: ShoppingList[];
  initialProducts: Product[];
}

export function ShoppingListView({ initialLists, initialProducts }: ShoppingListViewProps) {
  const router = useRouter();
  const [lists, setLists] = useState(initialLists);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const getStatusBadge = (status: ShoppingListStatus) => {
    const variants: Record<ShoppingListStatus, "default" | "secondary" | "outline"> = {
      [ShoppingListStatus.DRAFT]: "outline",
      [ShoppingListStatus.ACTIVE]: "secondary",
      [ShoppingListStatus.COMPLETED]: "default",
    };
    const labels: Record<ShoppingListStatus, string> = {
      [ShoppingListStatus.DRAFT]: "Taslak",
      [ShoppingListStatus.ACTIVE]: "Aktif",
      [ShoppingListStatus.COMPLETED]: "Tamamlandı",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const handleListCreated = async (list: ShoppingList) => {
    setLists((prev) => [list, ...prev]);
    setIsListDialogOpen(false);
    router.refresh();
  };

  const handleListUpdated = async (list: ShoppingList) => {
    setLists((prev) =>
      prev.map((l) => (l.id === list.id ? list : l))
    );
    setIsListDialogOpen(false);
    setEditingList(null);
    router.refresh();
  };

  const handleListDeleted = async (listId: string) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    if (selectedList === listId) {
      setSelectedList(null);
    }
    router.refresh();
  };

  // Scroll to detail when a list is selected
  useEffect(() => {
    if (selectedList && detailRef.current) {
      // Small delay to ensure the component is rendered
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }, 100);
    }
  }, [selectedList]);

  return (
    <div className="space-y-6">
      {/* Lists Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Lists
            </CardTitle>
            <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingList(null);
                    setIsListDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingList ? "Edit List" : "New Shopping List"}</DialogTitle>
                  <DialogDescription>
                    {editingList ? "Update list information" : "Create a new shopping list"}
                  </DialogDescription>
                </DialogHeader>
                <ShoppingListForm
                  list={editingList}
                  onSuccess={editingList ? handleListUpdated : handleListCreated}
                  onDelete={editingList ? () => handleListDeleted(editingList.id) : undefined}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No shopping lists yet. Create your first list.
            </p>
          ) : (
            <div className="space-y-2">
              {lists.map((list) => {
                const isCompleted = list.status === ShoppingListStatus.COMPLETED;
                return (
                  <div
                    key={list.id}
                    className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedList === list.id ? "bg-muted" : ""
                    } ${
                      isCompleted 
                        ? "border-green-600 bg-green-600 text-white" 
                        : ""
                    }`}
                    onClick={() => setSelectedList(list.id === selectedList ? null : list.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isCompleted && (
                            <CheckCircle2 className="h-5 w-5 text-green-200 flex-shrink-0" />
                          )}
                          <span className={`${isCompleted ? "text-white font-bold" : "font-medium"}`}>
                            {list.name}
                          </span>
                          {getStatusBadge(list.status)}
                        </div>
                        <div className={`text-sm ${isCompleted ? "text-white" : "text-muted-foreground"}`}>
                          {list._count?.items || 0} item{(list._count?.items || 0) !== 1 ? "s" : ""}
                          {list.createdBy && (
                            <> • Created by {list.createdBy.name || list.createdBy.email}</>
                          )}
                        </div>
                        {list.description && (
                          <div className={`text-xs mt-1 ${isCompleted ? "text-white/90" : "text-muted-foreground"}`}>{list.description}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingList(list);
                          setIsListDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* List Detail */}
      {selectedList && (
        <div ref={detailRef}>
          <ShoppingListDetail
            listId={selectedList}
            products={initialProducts}
            onClose={() => setSelectedList(null)}
            onUpdate={handleListUpdated}
            onDelete={handleListDeleted}
          />
        </div>
      )}
    </div>
  );
}
