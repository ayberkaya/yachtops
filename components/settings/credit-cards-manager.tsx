"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, CreditCard } from "lucide-react";

interface CreditCard {
  id: string;
  ownerName: string;
  lastFourDigits: string;
  billingCycleEndDate: number | null;
  createdAt: string;
  updatedAt: string;
}

export function CreditCardsManager() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formData, setFormData] = useState({ 
    ownerName: "", 
    lastFourDigits: "", 
    billingCycleEndDate: "" 
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCreditCards();
  }, []);

  const loadCreditCards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/credit-cards");
      if (response.ok) {
        const data = await response.json();
        setCreditCards(data);
      } else {
        setError("Failed to load credit cards");
      }
    } catch (error) {
      console.error("Error loading credit cards:", error);
      setError("Failed to load credit cards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (card?: CreditCard) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        ownerName: card.ownerName,
        lastFourDigits: card.lastFourDigits,
        billingCycleEndDate: card.billingCycleEndDate?.toString() || "",
      });
    } else {
      setEditingCard(null);
      setFormData({ ownerName: "", lastFourDigits: "", billingCycleEndDate: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCard(null);
    setFormData({ ownerName: "", lastFourDigits: "", billingCycleEndDate: "" });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!formData.ownerName.trim()) {
      setError("Owner name is required");
      return;
    }

    if (!formData.lastFourDigits.trim() || formData.lastFourDigits.length !== 4) {
      setError("Last four digits must be exactly 4 characters");
      return;
    }

    // Validate that last four digits are numeric
    if (!/^\d{4}$/.test(formData.lastFourDigits)) {
      setError("Last four digits must be numbers only");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCard
        ? `/api/credit-cards/${editingCard.id}`
        : "/api/credit-cards";
      const method = editingCard ? "PATCH" : "POST";

      const payload = {
        ownerName: formData.ownerName.trim(),
        lastFourDigits: formData.lastFourDigits.trim(),
        billingCycleEndDate: formData.billingCycleEndDate 
          ? parseInt(formData.billingCycleEndDate, 10) 
          : null,
      };
      
      // Validate billing cycle end date if provided
      if (formData.billingCycleEndDate) {
        const day = parseInt(formData.billingCycleEndDate, 10);
        if (isNaN(day) || day < 1 || day > 31) {
          setError("Billing cycle end date must be between 1 and 31");
          setIsSubmitting(false);
          return;
        }
      }
      
      console.log("Submitting credit card:", payload);
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      console.log("Response status:", response.status);

      if (response.ok) {
        setSuccess(editingCard
          ? "Credit card updated successfully"
          : "Credit card added successfully");
        handleCloseDialog();
        loadCreditCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        // Show validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details.map((err: any) => err.message).join(", ");
          setError(`Validation error: ${validationErrors}`);
        } else {
          setError(errorData.error || `Failed to save credit card (${response.status})`);
        }
      }
    } catch (error) {
      console.error("Error saving credit card:", error);
      setError(error instanceof Error ? error.message : "Failed to save credit card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this credit card?")) {
      return;
    }

    try {
      const response = await fetch(`/api/credit-cards/${cardId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess("Credit card deleted successfully");
        loadCreditCards();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete credit card");
      }
    } catch (error) {
      console.error("Error deleting credit card:", error);
      setError("Failed to delete credit card");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Credit Cards</CardTitle>
            <CardDescription>
              Manage credit cards for expense tracking
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCard ? "Edit Credit Card" : "Add Credit Card"}
                </DialogTitle>
                <DialogDescription>
                  Enter the card owner name and last four digits of the card.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Card Owner Name</Label>
                    <Input
                      id="ownerName"
                      value={formData.ownerName}
                      onChange={(e) => {
                        setFormData({ ...formData, ownerName: e.target.value });
                        setError(null);
                      }}
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastFourDigits">Last Four Digits</Label>
                    <Input
                      id="lastFourDigits"
                      value={formData.lastFourDigits}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setFormData({ ...formData, lastFourDigits: value });
                        setError(null);
                      }}
                      placeholder="1234"
                      maxLength={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCycleEndDate">Billing Cycle End Date (Day of Month)</Label>
                    <Input
                      id="billingCycleEndDate"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.billingCycleEndDate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                        setFormData({ ...formData, billingCycleEndDate: value });
                        setError(null);
                      }}
                      placeholder="e.g., 15 (optional)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Day of the month when the billing cycle ends (1-31). Leave empty if not applicable.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : editingCard ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {success}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading credit cards...
          </div>
        ) : creditCards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No credit cards added yet</p>
            <p className="text-sm mt-2">
              Add a credit card to use it when creating expenses
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {creditCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{card.ownerName}</p>
                    <p className="text-sm text-muted-foreground">
                      •••• {card.lastFourDigits}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(card)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(card.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

