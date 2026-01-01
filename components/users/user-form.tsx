"use client";

import { useState, useEffect } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UserRole } from "@prisma/client";
import { Permission, DEFAULT_PERMISSIONS, PERMISSION_GROUPS, parsePermissions, PERMISSION_DESCRIPTIONS } from "@/lib/permissions";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole),
  customRoleId: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSuccess: () => void;
}

interface CustomRole {
  id: string;
  name: string;
  permissions: string;
  active: boolean;
}

export function UserForm({ onSuccess }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: UserRole.CREW,
      customRoleId: null,
      permissions: [],
    },
  });

  const selectedRole = form.watch("role");
  const selectedCustomRoleId = form.watch("customRoleId");

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

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const submitData: any = {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
      };

      // Add custom role if selected
      if (data.customRoleId) {
        submitData.customRoleId = data.customRoleId;
      }

      if (useCustomPermissions) {
        submitData.permissions = data.permissions || [];
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create user");
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
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
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
                setUseCustomPermissions(checked as boolean);
                if (!checked) {
                  // Reset to role defaults
                  if (selectedCustomRoleId) {
                    const customRole = customRoles.find(r => r.id === selectedCustomRoleId);
                    if (customRole) {
                      const rolePermissions = parsePermissions(customRole.permissions);
                      form.setValue("permissions", rolePermissions);
                    }
                  } else {
                    form.setValue("permissions", DEFAULT_PERMISSIONS[selectedRole] || []);
                  }
                }
              }}
            />
            <label
              htmlFor="custom-permissions"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {selectedCustomRoleId 
                ? "Edit custom role permissions"
                : "Use custom permissions (override role defaults)"}
            </label>
          </div>
          {selectedCustomRoleId && (
            <p className="text-xs text-muted-foreground">
              Custom role permissions are loaded. You can modify them below.
            </p>
          )}
        </div>

        {useCustomPermissions && (
          <div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
            <p className="text-sm font-semibold mb-2">Permissions</p>
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
                            id={permission}
                            checked={permissions.includes(permission)}
                            onCheckedChange={() => togglePermission(permission)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-0.5">
                            <label
                              htmlFor={permission}
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

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
