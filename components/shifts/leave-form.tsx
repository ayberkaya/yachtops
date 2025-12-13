"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeaveType, LeaveStatus } from "@prisma/client";
import { Calendar } from "lucide-react";

type Leave = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason?: string | null;
  status: LeaveStatus;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  approvedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

interface LeaveFormProps {
  leave?: Leave | null;
  users: User[];
  onSuccess: () => void;
  onDelete?: () => void;
}

const leaveTypeLabels: Record<LeaveType, string> = {
  ANNUAL_LEAVE: "Annual Leave",
  SICK_LEAVE: "Sick Leave",
  PERSONAL_LEAVE: "Personal Leave",
  EMERGENCY_LEAVE: "Emergency Leave",
};

const leaveStatusLabels: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function LeaveForm({ leave, users, onSuccess, onDelete }: LeaveFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out OWNER, SUPER_ADMIN, and ADMIN from crew member selection
  const crewMembers = users.filter((user) => {
    const role = String(user.role || "").toUpperCase().trim();
    return role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "ADMIN";
  });

  const [formData, setFormData] = useState({
    userId: leave?.userId || "",
    startDate: leave?.startDate || "",
    endDate: leave?.endDate || "",
    type: leave?.type || LeaveType.ANNUAL_LEAVE,
    reason: leave?.reason || "",
    status: leave?.status || LeaveStatus.PENDING,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = leave ? `/api/leaves/${leave.id}` : "/api/leaves";
      const method = leave ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch (parseError) {
            throw new Error(`Failed to save leave: ${response.status} ${response.statusText}`);
          }
        } else {
          // If we get HTML (Next.js error page), try to extract useful info
          const text = await response.text();
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            throw new Error(`Server error: ${response.status} ${response.statusText}. Please check the server logs for details.`);
          }
          throw new Error(`Server error: ${response.status} ${response.statusText}. ${text.substring(0, 200)}`);
        }
        throw new Error(errorData.error || errorData.message || errorData.details || "Failed to save leave");
      }

      const result = await response.json();
      onSuccess();
    } catch (err) {
      console.error("Error saving leave:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!leave || !onDelete) return;
    if (!confirm("Are you sure you want to delete this leave? This action cannot be undone.")) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/leaves/${leave.id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete leave");
      }
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="userId">Crew Member *</Label>
          <Select
            value={formData.userId}
            onValueChange={(value) => setFormData({ ...formData, userId: value })}
            required
            disabled={!!leave}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select crew member" />
            </SelectTrigger>
            <SelectContent>
              {crewMembers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Leave Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as LeaveType })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(leaveTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as LeaveStatus })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(leaveStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          value={formData.reason || ""}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={3}
          placeholder="Optional reason for leave..."
        />
      </div>

      <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
        {leave && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || isDeleting}
            className="sm:mr-auto"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading || isDeleting}>
            {isLoading ? "Saving..." : leave ? "Update" : "Create"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

