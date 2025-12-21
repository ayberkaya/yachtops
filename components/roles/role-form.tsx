"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { Permission, PERMISSION_GROUPS, parsePermissions, PERMISSION_DESCRIPTIONS } from "@/lib/permissions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

const roleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(0),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string;
  active: boolean;
}

interface RoleFormProps {
  role?: CustomRole;
  onSuccess: () => void;
}

export function RoleForm({ role, onSuccess }: RoleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role ? parsePermissions(role.permissions) : [],
    },
  });

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

  const toggleGroup = (groupPermissions: Permission[]) => {
    const current = permissions;
    const allSelected = groupPermissions.every((p) => current.includes(p));
    
    if (allSelected) {
      // Deselect all in group
      form.setValue(
        "permissions",
        current.filter((p) => !groupPermissions.includes(p as Permission))
      );
    } else {
      // Select all in group
      const newPermissions = [...current];
      groupPermissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      form.setValue("permissions", newPermissions);
    }
  };

  const onSubmit = async (data: RoleFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = role ? `/api/roles/${role.id}` : "/api/roles";
      const method = role ? "PATCH" : "POST";

      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        permissions: data.permissions || [],
      };
      
      console.log("📤 Sending role data:", JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Show detailed validation errors if available
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
          setError(result.error + ': ' + errorMessages);
        } else {
          setError(result.error || "Failed to save role");
        }
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., First Officer" />
              </FormControl>
              <FormDescription>
                A unique name for this role within your vessel
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Optional description of this role's responsibilities"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div>
            <FormLabel>Permissions</FormLabel>
            <FormDescription>
              Select the permissions for this role. Permissions are organized by category.
            </FormDescription>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermissions]) => {
                const selectedCount = groupPermissions.filter((p) => permissions.includes(p)).length;
                const allSelected = selectedCount === groupPermissions.length;

                return (
                  <AccordionItem key={groupName} value={groupName} className="border-b">
                    <div className="flex items-center justify-between pr-4">
                      <AccordionTrigger className="text-sm font-semibold flex-1">
                        <div className="flex items-center gap-2">
                          <span>{groupName}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({selectedCount} of {groupPermissions.length})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(groupPermissions);
                        }}
                        className="h-8 ml-2"
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <AccordionContent>
                      <div className="grid grid-cols-1 gap-3 pt-2">
                        {groupPermissions.map((permission) => {
                          const isChecked = permissions.includes(permission);
                          const permissionLabel = permission
                            .split(".")
                            .slice(1)
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ");

                          return (
                            <div key={permission} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                              <Checkbox
                                id={permission}
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(permission)}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-0.5">
                                <label
                                  htmlFor={permission}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {permissionLabel}
                                </label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {PERMISSION_DESCRIPTIONS[permission]}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </ScrollArea>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : role ? "Update Role" : "Create Role"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

