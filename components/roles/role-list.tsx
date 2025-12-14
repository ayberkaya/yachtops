"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { RoleForm } from "./role-form";
import { parsePermissions, Permission, PERMISSION_GROUPS } from "@/lib/permissions";

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    users: number;
  };
}

interface RoleListProps {
  initialRoles: CustomRole[];
}

export function RoleList({ initialRoles }: RoleListProps) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete role "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to delete role");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleToggleActive = async (role: CustomRole) => {
    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !role.active }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to update role");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const getPermissionCount = (permissionsJson: string): number => {
    const permissions = parsePermissions(permissionsJson);
    return permissions.length;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Role</DialogTitle>
              <DialogDescription>Create a new custom role with specific permissions</DialogDescription>
            </DialogHeader>
            <RoleForm
              onSuccess={() => {
                setIsDialogOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {roles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No roles found. Create your first custom role.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPermissionCount(role.permissions)} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {role._count.users} user{role._count.users !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.active ? "default" : "secondary"}>
                        {role.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(role.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRole(role);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(role)}
                        >
                          {role.active ? "Deactivate" : "Activate"}
                        </Button>
                        {role._count.users === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role.id, role.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role details and permissions</DialogDescription>
          </DialogHeader>
          {editingRole && (
            <RoleForm
              role={editingRole}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingRole(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

