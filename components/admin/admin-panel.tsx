/* Admin Panel - super admin only */
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
import { Users, UserPlus, ChevronDown, Trash2, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelect } from "@/components/ui/country-select";
import { countries } from "@/lib/data/countries";

type UserForm = {
  name: string;
  email: string;
  vesselName: string;
  vesselType: string; // Motor Yacht, Sailing Yacht, Catamaran, Gulet, Other
  vesselFlag: string;
  vesselSize: string; // LOA in meters
  crewCount: string; // Total crew count
  planId: string | null;
};

type TenantUser = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  customRoleId: string | null;
  customRole: {
    id: string;
    name: string;
  } | null;
  active: boolean;
  createdAt: string;
};

type OwnerItem = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  yachtId: string | null;
  active: boolean;
  createdAt: string;
  users?: TenantUser[];
};

type AdminPanelProps = {
  view?: "create" | "owners";
  initialValues?: {
    name?: string;
    email?: string;
    vessel?: string;
    role?: string;
  };
};


export default function AdminPanel({ 
  view = "create",
  initialValues 
}: AdminPanelProps) {
  // Initialize form with initialValues if available
  // This handles the case where initialValues are available on mount
  const [form, setForm] = useState<UserForm>(() => {
    // Values are already decoded in server component, no need to decode again
    return {
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      vesselName: initialValues?.vessel || "",
      vesselType: "Motor Yacht", // Default vessel type
      vesselFlag: "",
      vesselSize: "",
      crewCount: "1", // Default crew count
      planId: null,
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number; currency: string; min_loa: number; max_loa: number | null }>>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const res = await fetch("/api/admin/plans", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    };
    if (view === "create") {
      fetchPlans();
    }
  }, [view]);

  // Auto-select plan based on vessel size
  useEffect(() => {
    if (form.vesselSize && plans.length > 0) {
      const vesselSizeNum = parseFloat(form.vesselSize);
      if (!isNaN(vesselSizeNum)) {
        // Find the matching plan based on LOA range
        const matchingPlan = plans.find((plan) => {
          const min = plan.min_loa;
          const max = plan.max_loa;
          if (max === null) {
            // Enterprise plan (60m+)
            return vesselSizeNum >= min;
          }
          return vesselSizeNum >= min && vesselSizeNum <= max;
        });
        
        if (matchingPlan && form.planId !== matchingPlan.id) {
          setForm((prev) => ({ ...prev, planId: matchingPlan.id }));
        }
      }
    }
  }, [form.vesselSize, plans]);

  // Force form to populate from URL params using useEffect
  // This is critical for auto-filling from URL parameters
  // Handles both initial mount and when initialValues change after mount (e.g., dynamic import with ssr: false)
  // Use stable dependency array with individual properties to avoid React warnings about changing array size
  const initialName = initialValues?.name;
  const initialEmail = initialValues?.email;
  const initialVessel = initialValues?.vessel;
  
  useEffect(() => {
    // Check if we have any initial values to apply
    const hasInitialValues = initialName || initialEmail || initialVessel;

    if (hasInitialValues) {
      // Force update form state with initial values
      // This ensures URL params populate the form even if they arrive after mount
      setForm((prev) => {
        const updates: Partial<UserForm> = {};
        let hasChanges = false;
        
        // Only update if value exists and is different from current
        if (initialName && initialName.trim() && initialName !== prev.name) {
          updates.name = initialName.trim();
          hasChanges = true;
        }
        if (initialEmail && initialEmail.trim() && initialEmail !== prev.email) {
          updates.email = initialEmail.trim();
          hasChanges = true;
        }
        if (initialVessel && initialVessel.trim() && initialVessel !== prev.vesselName) {
          updates.vesselName = initialVessel.trim();
          hasChanges = true;
        }
        
        // Only update if there are actual changes to avoid unnecessary re-renders
        if (hasChanges) {
          return {
            ...prev,
            ...updates,
            // Preserve these fields - don't overwrite with empty values
            vesselType: prev.vesselType,
            vesselFlag: prev.vesselFlag,
            vesselSize: prev.vesselSize,
            crewCount: prev.crewCount,
            planId: prev.planId,
          };
        }
        
        return prev;
      });
    }
  }, [initialName, initialEmail, initialVessel]);

  const handleCreate = async () => {
    setMessage(null);
    
    // Validation
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.vesselName.trim() ||
      !form.vesselType ||
      !form.vesselFlag.trim() ||
      !form.vesselSize.trim() ||
      !form.crewCount.trim() ||
      !form.planId
    ) {
      setMessage("Please fill in all fields including vessel size, crew count, and select a plan.");
      return;
    }

    // Validate crew count
    const crewCountNum = parseInt(form.crewCount, 10);
    if (isNaN(crewCountNum) || crewCountNum < 1) {
      setMessage("Crew count must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      // Use server action instead of API route
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      formData.append("vesselName", form.vesselName.trim());
      formData.append("vesselType", form.vesselType);
      formData.append("vesselFlag", form.vesselFlag.trim());
      formData.append("vesselSize", form.vesselSize.trim());
      formData.append("crewCount", form.crewCount.trim());
      // Send plan name instead of planId - backend will lookup the ID
      const selectedPlan = plans.find((p) => p.id === form.planId);
      formData.append("plan", selectedPlan?.name || "Essentials");

      const { createUserAndInvite } = await import("@/actions/create-user");
      const result = await createUserAndInvite(formData);

      if (result.success) {
        setMessage(result.message || "Customer created successfully. Welcome email sent!");
        setForm({
          name: "",
          email: "",
          vesselName: "",
          vesselType: "Motor Yacht",
          vesselFlag: "",
          vesselSize: "",
          crewCount: "1",
          planId: null,
        });
        await loadOwners();
      } else {
        setMessage(result.message || "User creation failed");
      }
    } catch (e) {
      console.error("Error creating user:", e);
      setMessage("An error occurred, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadOwners = async () => {
    setLoadingOwners(true);
    try {
      const res = await fetch("/api/admin/owners?includeUsers=true", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load owners (${res.status})`);
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      const safeOwners = Array.isArray(data) ? data : [];

      setOwners(safeOwners);
      if (!selectedOwnerId && safeOwners.length) {
        setSelectedOwnerId(safeOwners[0].id);
      }
    } catch (e) {
      console.error("loadOwners error", e);
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  };

  const toggleOwnerActive = async (ownerId: string, active: boolean) => {
    const prev = owners;
    setOwners((list) => list.map((o) => (o.id === ownerId ? { ...o, active } : o)));
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("owner toggle failed");
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    const prev = owners;
    setOwners((list) =>
      list.map((o) => ({
        ...o,
        users: o.users?.map((u) => (u.id === userId ? { ...u, active } : u)),
      }))
    );
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("user toggle failed");
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  const handleDeleteClick = (owner: OwnerItem) => {
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
      
      // If deleted owner was selected, clear selection
      if (selectedOwnerId === ownerToDelete.id) {
        setSelectedOwnerId(null);
      }

      setDeleteDialogOpen(false);
      setOwnerToDelete(null);
    } catch (e: any) {
      console.error("Delete error:", e);
      alert(e.message || "Failed to delete owner. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (view === "owners") {
      loadOwners();
    }
  }, [view]);

  const selectedOwner = view === "owners" ? owners.find((o) => o.id === selectedOwnerId) || null : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {view === "create" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        <span>{view === "create" ? "Create User" : "Owners"}</span>
      </div>

      <div className="space-y-6">
        {view === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Customer</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Creates a new vessel and owner account. Default expense categories will be set up automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Row 1: Full Name | Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Row 2: Vessel Name | Vessel Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Vessel Name</Label>
                  <Input
                    value={form.vesselName}
                    onChange={(e) => setForm((f) => ({ ...f, vesselName: e.target.value }))}
                    placeholder="Enter vessel name"
                  />
                </div>
                <div>
                  <Label>Vessel Type</Label>
                  <Select
                    value={form.vesselType}
                    onValueChange={(value) => setForm((f) => ({ ...f, vesselType: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vessel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Motor Yacht">Motor Yacht</SelectItem>
                      <SelectItem value="Sailing Yacht">Sailing Yacht</SelectItem>
                      <SelectItem value="Catamaran">Catamaran</SelectItem>
                      <SelectItem value="Gulet">Gulet</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Vessel Size (LOA) | Total Crew Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Vessel Size (LOA in meters)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.vesselSize}
                    onChange={(e) => setForm((f) => ({ ...f, vesselSize: e.target.value }))}
                    placeholder="e.g. 45"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the Length Overall (LOA) in meters. Plan will be auto-selected based on size.
                  </p>
                </div>
                <div>
                  <Label>Total Crew Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.crewCount}
                    onChange={(e) => setForm((f) => ({ ...f, crewCount: e.target.value }))}
                    placeholder="e.g. 8"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total number of crew members on board.
                  </p>
                </div>
              </div>

              {/* Row 4: Vessel Flag */}
              <div>
                <Label>Vessel Flag</Label>
                <CountrySelect
                  value={form.vesselFlag}
                  onChange={(value) => {
                    setForm((f) => ({ ...f, vesselFlag: value }));
                  }}
                  placeholder="Select country flag"
                />
              </div>

              {/* Subscription Plan Selection */}
              <div className="mt-6 pt-6 border-t border-border">
                <Label className="text-base font-semibold mb-4 block">Subscription Plan</Label>
                {loadingPlans ? (
                  <p className="text-sm text-muted-foreground">Loading plans...</p>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans available. Please contact support.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {plans.map((plan) => {
                      const isSelected = form.planId === plan.id;
                      const formatPrice = (price: number, currency: string) => {
                        if (price === 0) return "Custom";
                        return new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: currency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(price);
                      };
                      const formatLOA = (min: number, max: number | null) => {
                        if (max === null) return `${min}m+`;
                        if (min === 0 && max) return `Up to ${max}m`;
                        return `${min}-${max}m`;
                      };

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, planId: plan.id }))}
                          className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base">{plan.name}</span>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">{formatPrice(plan.price, plan.currency)}</span>
                              {plan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatLOA(plan.min_loa, plan.max_loa)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.planId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: {plans.find((p) => p.id === form.planId)?.name || "Unknown"}
                  </p>
                )}
              </div>

              <Button onClick={handleCreate} disabled={submitting} className="mt-6">
                {submitting ? "Creating..." : "Create Customer"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        )}

        {view === "owners" && (
          <>
            {loadingOwners && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Loading owners...
                </CardContent>
              </Card>
            )}

            {!loadingOwners && owners.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Owners</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No owners found.
                </CardContent>
              </Card>
            )}

            {!loadingOwners && owners.length > 0 && (
              <div className="space-y-3">
                {owners.map((owner) => (
                  <Collapsible
                    key={owner.id}
                    open={selectedOwnerId === owner.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setSelectedOwnerId(owner.id);
                      } else if (selectedOwnerId === owner.id) {
                        setSelectedOwnerId(null);
                      }
                    }}
                  >
                    <Card className="gap-1.5 p-3">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between py-1.5 px-0 min-h-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="m-0 text-base">{owner.name || "Unnamed"}</CardTitle>
                            {!owner.active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                Inactive
                              </span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-2 pt-0 px-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">{owner.email}</div>
                              <div className="text-xs text-muted-foreground">
                                Tenant: {owner.yachtId || "-"}
                              </div>
                              {owner.users && owner.users.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {owner.users.length} user{owner.users.length !== 1 ? "s" : ""} in this vessel
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={owner.active ? "secondary" : "default"}
                                onClick={() => toggleOwnerActive(owner.id, !owner.active)}
                              >
                                {owner.active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(owner)}
                                title="Delete owner"
                                aria-label="Delete owner"
                                className="gap-2"
                              >
                                <Trash2 className="h-5 w-5 shrink-0 stroke-current" />
                                <span className="font-medium">Delete</span>
                              </Button>
                            </div>
                          </div>

                          {owner.users && owner.users.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold">Users</div>
                              <div className="space-y-2">
                                {owner.users.map((u) => (
                                  <div
                                    key={u.id}
                                    className="flex items-center justify-between rounded border p-2"
                                  >
                                    <div>
                                      <div className="font-medium text-sm">
                                        {u.name || u.username || u.email}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {u.email} • {u.customRole?.name || u.role}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={u.active ? "secondary" : "default"}
                                      onClick={() => toggleUserActive(u.id, !u.active)}
                                    >
                                      {u.active ? "Deactivate" : "Activate"}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Owner</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Are you sure you want to delete <strong>{ownerToDelete?.name || ownerToDelete?.email}</strong>?
            </p>
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

