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
import { Permission, DEFAULT_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSuccess: () => void;
}

export function UserForm({ onSuccess }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: UserRole.CREW,
      permissions: [],
    },
  });

  const selectedRole = form.watch("role");

  const handleRoleChange = (role: UserRole) => {
    form.setValue("role", role);
    if (!useCustomPermissions) {
      form.setValue("permissions", DEFAULT_PERMISSIONS[role] || []);
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
              <FormDescription>
                Default permissions will be applied based on role
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
                  form.setValue("permissions", DEFAULT_PERMISSIONS[selectedRole] || []);
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
        </div>

        {useCustomPermissions && (
          <div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
            <p className="text-sm font-medium">Permissions</p>
            {Object.entries(PERMISSION_GROUPS).map(([group, groupPermissions]) => (
              <div key={group} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{group}</p>
                <div className="grid grid-cols-2 gap-2">
                  {groupPermissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={permissions.includes(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                      />
                      <label
                        htmlFor={permission}
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

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
