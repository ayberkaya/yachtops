"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { UserRole } from "@prisma/client";
import { X } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date | string;
  expiresAt: Date | string;
}

interface PendingInvitesTableProps {
  invites: PendingInvite[];
  roleLabels: Record<UserRole, string>;
}

export function PendingInvitesTable({ invites, roleLabels }: PendingInvitesTableProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (inviteId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    try {
      setCancellingId(inviteId);
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel invitation");
      }

      toast({
        description: "Invitation cancelled successfully",
        variant: "success",
        duration: 5000,
      });
      router.refresh(); // Refresh the page to update the list
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        description: error instanceof Error ? error.message : "Failed to cancel invitation",
        variant: "error",
        duration: 5000,
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (invites.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No pending invitations</p>
        <p className="text-sm text-muted-foreground mt-2">
          Invite crew members using the form above
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Sent At</TableHead>
          <TableHead>Expires At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell className="font-medium">{invite.email}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {roleLabels[invite.role as UserRole] || invite.role}
              </Badge>
            </TableCell>
            <TableCell>
              {format(
                invite.createdAt instanceof Date 
                  ? invite.createdAt 
                  : new Date(invite.createdAt),
                "MMM d, yyyy 'at' h:mm a"
              )}
            </TableCell>
            <TableCell>
              {format(
                invite.expiresAt instanceof Date 
                  ? invite.expiresAt 
                  : new Date(invite.expiresAt),
                "MMM d, yyyy 'at' h:mm a"
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancel(invite.id)}
                disabled={cancellingId === invite.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {cancellingId === invite.id ? (
                  "Cancelling..."
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

