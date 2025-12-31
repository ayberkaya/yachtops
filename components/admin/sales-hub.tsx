"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, Rocket, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Owner = {
  id: string;
  name: string | null;
  email: string;
  yachtId: string | null;
  yachtName: string | null;
  subscriptionStatus: string | null;
  planId: string | null;
  planName: string | null;
  trialEndsAt: string | null;
  active: boolean;
  createdAt: string;
};

export function SalesHub() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<Owner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOwners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/owners", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load owners");
      const data = await res.json();
      setOwners(data || []);
    } catch (e) {
      console.error("Error loading owners:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const handleDeleteClick = (owner: Owner) => {
    setOwnerToDelete(owner);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ownerToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/owners/${ownerToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete owner");
      }

      // Remove owner from list
      setOwners((list) => list.filter((o) => o.id !== ownerToDelete.id));
      setDeleteDialogOpen(false);
      setOwnerToDelete(null);
    } catch (e: any) {
      console.error("Delete error:", e);
      alert(e.message || "Failed to delete owner. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleImpersonate = async (ownerId: string) => {
    try {
      // Call API to initiate impersonation
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: ownerId }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to impersonate user");
        return;
      }

      const data = await res.json();
      
      // Use NextAuth signIn with impersonation token
      // Note: When redirect is true, signIn returns void, so we can't check for errors
      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        impersonateToken: ownerId,
        redirect: true,
        callbackUrl: "/dashboard",
      });
    } catch (error: any) {
      console.error("Impersonation error:", error);
      alert("An error occurred while switching user");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getNextBillingDate = (trialEndsAt: string | null, status: string | null) => {
    if (status === "TRIAL" && trialEndsAt) {
      return formatDate(trialEndsAt);
    }
    // For ACTIVE subscriptions, calculate next billing (30 days from now)
    if (status === "ACTIVE") {
      const nextBilling = new Date();
      nextBilling.setDate(nextBilling.getDate() + 30);
      return formatDate(nextBilling.toISOString());
    }
    return "N/A";
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">No Status</Badge>;
    }

    switch (status.toUpperCase()) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            ACTIVE
          </Badge>
        );
      case "PAST_DUE":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            PAST_DUE
          </Badge>
        );
      case "TRIAL":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            TRIAL
          </Badge>
        );
      case "PENDING":
      case "INCOMPLETE":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            {status.toUpperCase()}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales & Onboarding Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage yacht owners and subscriptions
          </p>
        </div>
        <Link href="/admin/create">
          <Button size="lg">
            <Rocket className="mr-2 h-4 w-4" />
            🚀 Onboard New Yacht
          </Button>
        </Link>
      </div>

      {/* Owners Table */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading owners...
          </div>
        ) : owners.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No owners found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Yacht Name</TableHead>
                <TableHead>Owner Info</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription Status</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium">
                    {owner.yachtName || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{owner.name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">
                        {owner.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {owner.planName || "No Plan"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(owner.subscriptionStatus)}</TableCell>
                  <TableCell>
                    {getNextBillingDate(owner.trialEndsAt, owner.subscriptionStatus)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImpersonate(owner.id)}
                        title="Login as User"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(owner)}
                        title="Delete Owner"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Owner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{ownerToDelete?.name || ownerToDelete?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The owner account</li>
                <li>The associated vessel (yacht)</li>
                <li>All users in this vessel</li>
                <li>All data associated with this vessel (trips, tasks, expenses, etc.)</li>
              </ul>
            </div>
            <p className="text-destructive font-medium">This action cannot be undone.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Owner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

