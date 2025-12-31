"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UserRole } from "@prisma/client";
import { Permission, DEFAULT_PERMISSIONS, parsePermissions, PERMISSION_GROUPS, PERMISSION_DESCRIPTIONS } from "@/lib/permissions";

const userEditSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  customRoleId: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
});

type UserEditFormData = z.infer<typeof userEditSchema>;

interface CustomRole {
  id: string;
  name: string;
  permissions: string;
  active: boolean;
}

interface UserEditFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: UserRole;
    permissions: string | null;
    customRoleId: string | null;
    customRole: {
      id: string;
      name: string;
    } | null;
  };
  onSuccess: () => void;
}

export function UserEditForm({ user, onSuccess }: UserEditFormProps) {
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomPermissions, setUseCustomPermissions] = useState(
    user.permissions !== null && user.permissions !== ""
  );
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Fetch custom roles on mount
  useEffect(() => {
    const fetchCustomRoles = async () => {
      try {
        const response = await fetch("/api/roles");
        if (response.ok) {
          const roles = await response.json();
          setCustomRoles(roles.filter((r: CustomRole) => r.active));
        }
      } catch (error) {
        console.error("Error fetching custom roles:", error);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchCustomRoles();
  }, []);

  const currentPermissions = user.permissions && user.permissions !== ""
    ? parsePermissions(user.permissions)
    : DEFAULT_PERMISSIONS[user.role] || [];

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      role: user.role,
      customRoleId: user.customRoleId || null,
      permissions: currentPermissions,
    },
  });

  const selectedRole = form.watch("role");
  const selectedCustomRoleId = form.watch("customRoleId");

  // When role changes, update permissions to default for that role
  const handleRoleChange = (value: string) => {
    // Check if it's a custom role (starts with "custom_")
    if (value.startsWith("custom_")) {
      const customRoleId = value.replace("custom_", "");
      const customRole = customRoles.find(r => r.id === customRoleId);
      form.setValue("customRoleId", customRoleId);
      form.setValue("role", UserRole.CREW); // Default role for custom roles
      if (customRole) {
        const rolePermissions = parsePermissions(customRole.permissions);
        form.setValue("permissions", rolePermissions);
        // Custom roles have their own permissions, enable custom permissions view so user can edit
        setUseCustomPermissions(true);
      }
    } else {
      // System role
      const role = value as UserRole;
      form.setValue("role", role);
      form.setValue("customRoleId", null);
      if (!useCustomPermissions) {
        form.setValue("permissions", DEFAULT_PERMISSIONS[role] || []);
      }
    }
  };

  const onSubmit = async (data: UserEditFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the latest form values to ensure we have the most up-to-date permissions
      const latestData = form.getValues();
      
      const updateData: any = {
        name: latestData.name,
        phone: latestData.phone,
        role: latestData.role,
      };

      // Add custom role if selected
      if (latestData.customRoleId) {
        updateData.customRoleId = latestData.customRoleId;
      } else {
        updateData.customRoleId = null;
      }

      // Only send permissions if using custom permissions
      if (useCustomPermissions) {
        updateData.permissions = latestData.permissions || [];
      } else {
        // Clear custom permissions, use role defaults - send null to clear
        updateData.permissions = null;
      }

      console.log("📤 Sending update data:", JSON.stringify(updateData, null, 2));
      console.log("🔧 Use custom permissions:", useCustomPermissions);
      console.log("🔧 Latest permissions from form:", latestData.permissions);

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

      // If user updated their own role, refresh session
      if (session?.user?.id === user.id && latestData.role !== user.role) {
        try {
          await updateSession({ role: latestData.role });
        } catch (sessionError) {
          console.error("Failed to update session:", sessionError);
          // Don't fail the entire operation if session update fails
        }
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const permissions = form.watch("permissions") || [];

  const togglePermission = (permission: Permission) => {
    const current = form.getValues("permissions") || [];
    let newPermissions: string[];
    if (current.includes(permission)) {
      newPermissions = current.filter((p) => p !== permission);
    } else {
      newPermissions = [...current, permission];
    }
    form.setValue("permissions", newPermissions, { 
      shouldDirty: true, 
      shouldValidate: true 
    });
    // Automatically enable custom permissions when user modifies permissions
    if (!useCustomPermissions) {
      setUseCustomPermissions(true);
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <PhoneInput
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select
                onValueChange={handleRoleChange}
                value={selectedCustomRoleId ? `custom_${selectedCustomRoleId}` : field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={UserRole.OWNER}>Owner</SelectItem>
                  <SelectItem value={UserRole.CREW}>Crew</SelectItem>
                  <SelectItem value={UserRole.CAPTAIN}>Captain</SelectItem>
                  {customRoles.map((role) => (
                    <SelectItem key={role.id} value={`custom_${role.id}`}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {selectedCustomRoleId 
                  ? "Custom role permissions will be applied"
                  : "Default permissions will be applied based on role"}
              </FormDescription>
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
                  <Accordion type="single" collapsible className="w-full">
                    {Object.entries(PERMISSION_GROUPS).map(([group, groupPermissions]) => (
                      <AccordionItem key={group} value={group} className="border-b">
                        <AccordionTrigger className="text-sm font-semibold">
                          {group}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 gap-3 pt-2">
                            {groupPermissions.map((permission) => (
                              <div key={permission} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <Checkbox
                                  id={`edit-${permission}`}
                                  checked={permissions.includes(permission)}
                                  onCheckedChange={() => togglePermission(permission)}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-0.5">
                                  <label
                                    htmlFor={`edit-${permission}`}
                                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {permission.includes(".")
                                      ? permission.split(".")[1]?.replace("-", " ") || permission
                                      : permission}
                                  </label>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {PERMISSION_DESCRIPTIONS[permission]}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
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

