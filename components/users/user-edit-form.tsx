"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { UserRole } from "@prisma/client";
import { Permission, DEFAULT_PERMISSIONS, parsePermissions, PERMISSION_GROUPS } from "@/lib/permissions";

const userEditSchema = z.object({
  name: z.string().optional(),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.string()).optional(),
});

type UserEditFormData = z.infer<typeof userEditSchema>;

interface UserEditFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    permissions: string | null;
  };
  onSuccess: () => void;
}

export function UserEditForm({ user, onSuccess }: UserEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomPermissions, setUseCustomPermissions] = useState(
    user.permissions !== null && user.permissions !== ""
  );

  const currentPermissions = user.permissions && user.permissions !== ""
    ? parsePermissions(user.permissions)
    : DEFAULT_PERMISSIONS[user.role] || [];

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name || "",
      role: user.role,
      permissions: currentPermissions,
    },
  });

  const selectedRole = form.watch("role");

  // When role changes, update permissions to default for that role
  const handleRoleChange = (role: UserRole) => {
    form.setValue("role", role);
    if (!useCustomPermissions) {
      // Only update permissions if not using custom permissions
      form.setValue("permissions", DEFAULT_PERMISSIONS[role] || []);
    }
    // If using custom permissions, keep current permissions
  };

  const onSubmit = async (data: UserEditFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const updateData: any = {
        name: data.name,
        role: data.role,
      };

      // Only send permissions if using custom permissions
      if (useCustomPermissions) {
        updateData.permissions = data.permissions || [];
      } else {
        // Clear custom permissions, use role defaults - send null to clear
        updateData.permissions = null;
      }

      console.log("📤 Sending update data:", JSON.stringify(updateData, null, 2));
      console.log("🔧 Use custom permissions:", useCustomPermissions);

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to update user");
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const permissions = form.watch("permissions") || [];

  const togglePermission = (permission: Permission) => {
    const current = permissions;
    if (current.includes(permission)) {
      form.setValue(
        "permissions",
        current.filter((p) => p !== permission)
      );
    } else {
      form.setValue("permissions", [...current, permission]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <p className="text-sm font-medium mb-2">Email</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select
                onValueChange={(value) => handleRoleChange(value as UserRole)}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={UserRole.CREW}>Crew</SelectItem>
                  <SelectItem value={UserRole.CAPTAIN}>Captain</SelectItem>
                  <SelectItem value={UserRole.OWNER}>Owner</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="custom-permissions"
              checked={useCustomPermissions}
              onCheckedChange={(checked) => {
                const newValue = checked as boolean;
                setUseCustomPermissions(newValue);
                if (!newValue) {
                  // Reset to role defaults when disabling custom permissions
                  form.setValue("permissions", DEFAULT_PERMISSIONS[selectedRole] || []);
                } else {
                  // When enabling custom permissions, start with current role defaults if no custom permissions exist
                  const currentPerms = form.getValues("permissions");
                  if (!currentPerms || currentPerms.length === 0) {
                    form.setValue("permissions", DEFAULT_PERMISSIONS[selectedRole] || []);
                  }
                }
              }}
            />
            <label
              htmlFor="custom-permissions"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Use custom permissions (override role defaults)
            </label>
          </div>
          <FormDescription>
            {useCustomPermissions
              ? "Select specific permissions for this user"
              : `Using default permissions for ${selectedRole.toLowerCase()} role`}
          </FormDescription>
        </div>

        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              {useCustomPermissions && (
                <div className="space-y-4 border rounded-lg p-4">
                  <FormLabel>Permissions</FormLabel>
                  {Object.entries(PERMISSION_GROUPS).map(([group, groupPermissions]) => (
                    <div key={group} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{group}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {groupPermissions.map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${permission}`}
                              checked={permissions.includes(permission)}
                              onCheckedChange={() => togglePermission(permission)}
                            />
                            <label
                              htmlFor={`edit-${permission}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {permission.includes(".")
                                ? permission.split(".")[1]?.replace("-", " ") || permission
                                : permission}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update User"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

