import { SessionUser } from "./auth-utils";

export type Permission =
  // Financial data
  | "expenses.view"
  | "expenses.create"
  | "expenses.edit"
  | "expenses.approve"
  | "expenses.delete"
  | "expenses.categories.manage"
  // Operational data (maintenance, shifts, leaves)
  | "operational.view"
  | "operational.create"
  | "operational.edit"
  | "operational.delete"
  // Tasks
  | "tasks.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  // Documents
  | "documents.view"
  | "documents.create"
  | "documents.edit"
  | "documents.delete"
  | "documents.receipts.view"
  | "documents.marina.view"
  | "documents.vessel.view"
  | "documents.crew.view"
  | "documents.upload"
  // Inventory
  | "inventory.view"
  | "inventory.create"
  | "inventory.edit"
  | "inventory.delete"
  | "inventory.alcohol.view"
  | "inventory.alcohol.manage"
  // Voyages (Trips)
  | "trips.view"
  | "trips.create"
  | "trips.edit"
  | "trips.delete"
  // Calendar
  | "calendar.view"
  | "calendar.create"
  | "calendar.edit"
  | "calendar.delete"
  // Crew management
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  // Role management
  | "roles.view"
  | "roles.create"
  | "roles.edit"
  | "roles.delete"
  // Other
  | "settings.view"
  | "settings.edit"
  | "messages.view"
  | "messages.create"
  | "messages.edit"
  | "messages.delete"
  | "messages.channels.manage"
  | "shopping.view"
  | "shopping.create"
  | "shopping.edit"
  | "shopping.delete"
  | "performance.view"
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.edit"
  | "maintenance.delete"
  | "quotes.view"
  | "quotes.create"
  | "quotes.edit"
  | "quotes.delete"
  | "quotes.approve"
  | "vendors.view"
  | "vendors.create"
  | "vendors.edit"
  | "vendors.delete";

/**
 * Permission descriptions - what each permission allows
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  // Financial Data
  "expenses.view": "Giderleri görüntüleme",
  "expenses.create": "Yeni gider oluşturma",
  "expenses.edit": "Mevcut giderleri düzenleme",
  "expenses.approve": "Giderleri onaylama",
  "expenses.delete": "Giderleri silme",
  "expenses.categories.manage": "Gider kategorilerini yönetme",
  
  // Operational Data
  "operational.view": "Operasyonel verileri görüntüleme (vardiyalar, izinler vb.)",
  "operational.create": "Operasyonel veri oluşturma",
  "operational.edit": "Operasyonel verileri düzenleme",
  "operational.delete": "Operasyonel verileri silme",
  
  // Tasks
  "tasks.view": "Görevleri görüntüleme",
  "tasks.create": "Yeni görev oluşturma",
  "tasks.edit": "Görevleri düzenleme",
  "tasks.delete": "Görevleri silme",
  
  // Documents
  "documents.view": "Dokümanları görüntüleme",
  "documents.create": "Yeni doküman oluşturma",
  "documents.edit": "Dokümanları düzenleme",
  "documents.delete": "Dokümanları silme",
  "documents.receipts.view": "Fişleri görüntüleme",
  "documents.marina.view": "Marina dokümanlarını görüntüleme",
  "documents.vessel.view": "Tekne dokümanlarını görüntüleme",
  "documents.crew.view": "Mürettebat dokümanlarını görüntüleme",
  "documents.upload": "Doküman yükleme",
  
  // Inventory
  "inventory.view": "Envanteri görüntüleme",
  "inventory.create": "Yeni envanter kaydı oluşturma",
  "inventory.edit": "Envanter kayıtlarını düzenleme",
  "inventory.delete": "Envanter kayıtlarını silme",
  "inventory.alcohol.view": "Alkol envanterini görüntüleme",
  "inventory.alcohol.manage": "Alkol envanterini yönetme",
  
  // Voyages (Trips)
  "trips.view": "Seyahatleri görüntüleme",
  "trips.create": "Yeni seyahat oluşturma",
  "trips.edit": "Seyahatleri düzenleme",
  "trips.delete": "Seyahatleri silme",
  
  // Calendar
  "calendar.view": "Takvimi görüntüleme",
  "calendar.create": "Yeni takvim etkinliği oluşturma",
  "calendar.edit": "Takvim etkinliklerini düzenleme",
  "calendar.delete": "Takvim etkinliklerini silme",
  
  // Crew Management
  "users.view": "Kullanıcıları görüntüleme",
  "users.create": "Yeni kullanıcı oluşturma",
  "users.edit": "Kullanıcıları düzenleme",
  "users.delete": "Kullanıcıları silme",
  
  // Role Management
  "roles.view": "Rolleri görüntüleme",
  "roles.create": "Yeni rol oluşturma",
  "roles.edit": "Rolleri düzenleme",
  "roles.delete": "Rolleri silme",
  
  // Messages
  "messages.view": "Mesajları görüntüleme",
  "messages.create": "Mesaj gönderme",
  "messages.edit": "Mesajları düzenleme",
  "messages.delete": "Mesajları silme",
  "messages.channels.manage": "Mesaj kanallarını yönetme",
  
  // Shopping
  "shopping.view": "Alışveriş listelerini görüntüleme",
  "shopping.create": "Yeni alışveriş listesi oluşturma",
  "shopping.edit": "Alışveriş listelerini düzenleme",
  "shopping.delete": "Alışveriş listelerini silme",
  
  // Performance
  "performance.view": "Performans verilerini görüntüleme",
  
  // Maintenance
  "maintenance.view": "Bakım kayıtlarını görüntüleme",
  "maintenance.create": "Yeni bakım kaydı oluşturma",
  "maintenance.edit": "Bakım kayıtlarını düzenleme",
  "maintenance.delete": "Bakım kayıtlarını silme",
  
  // Quotes
  "quotes.view": "Teklifleri görüntüleme",
  "quotes.create": "Yeni teklif oluşturma",
  "quotes.edit": "Teklifleri düzenleme",
  "quotes.delete": "Teklifleri silme",
  "quotes.approve": "Teklifleri onaylama",
  
  // Vendors
  "vendors.view": "Firmaları görüntüleme",
  "vendors.create": "Yeni firma oluşturma",
  "vendors.edit": "Firmaları düzenleme",
  "vendors.delete": "Firmaları silme",
  
  // Settings
  "settings.view": "Ayarları görüntüleme",
  "settings.edit": "Ayarları düzenleme",
};

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  "Financial Data": [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
  ],
  "Operational Data": [
    "operational.view",
    "operational.create",
    "operational.edit",
    "operational.delete",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
  ],
  Tasks: [
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
  ],
  Documents: [
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
  ],
  Inventory: [
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
  ],
  Voyages: [
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
  ],
  Calendar: [
    "calendar.view",
    "calendar.create",
    "calendar.edit",
    "calendar.delete",
  ],
  "Crew Management": [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
  ],
  "Role Management": [
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
  ],
  Messages: [
    "messages.view",
    "messages.create",
    "messages.edit",
    "messages.delete",
    "messages.channels.manage",
  ],
  Shopping: [
    "shopping.view",
    "shopping.create",
    "shopping.edit",
    "shopping.delete",
  ],
  Performance: [
    "performance.view",
  ],
  Settings: [
    "settings.view",
    "settings.edit",
  ],
  Quotes: [
    "quotes.view",
    "quotes.create",
    "quotes.edit",
    "quotes.delete",
    "quotes.approve",
  ],
  Vendors: [
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.delete",
  ],
};

export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
    "operational.view",
    "operational.create",
    "operational.edit",
    "operational.delete",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
    "calendar.view",
    "calendar.create",
    "calendar.edit",
    "calendar.delete",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
    "messages.view",
    "messages.create",
    "messages.edit",
    "messages.delete",
    "messages.channels.manage",
    "shopping.view",
    "shopping.create",
    "shopping.edit",
    "shopping.delete",
    "performance.view",
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
    "quotes.view",
    "quotes.create",
    "quotes.edit",
    "quotes.delete",
    "quotes.approve",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.delete",
    "settings.view",
    "settings.edit",
  ],
  CAPTAIN: [
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "expenses.approve",
    "expenses.delete",
    "expenses.categories.manage",
    "operational.view",
    "operational.create",
    "operational.edit",
    "operational.delete",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
    "calendar.view",
    "calendar.create",
    "calendar.edit",
    "calendar.delete",
    "users.view",
    "users.create",
    "users.edit",
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
    "messages.view",
    "messages.create",
    "messages.edit",
    "messages.delete",
    "messages.channels.manage",
    "shopping.view",
    "shopping.create",
    "shopping.edit",
    "shopping.delete",
    "performance.view",
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.receipts.view",
    "documents.marina.view",
    "documents.vessel.view",
    "documents.crew.view",
    "documents.upload",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.alcohol.view",
    "inventory.alcohol.manage",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.delete",
    "quotes.view",
    "quotes.create",
    "quotes.edit",
    "quotes.delete",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.delete",
    "settings.view",
  ],
  CREW: [
    "expenses.view",
    "expenses.create",
    "tasks.view",
    "trips.view",
    "calendar.view",
    "messages.view",
    "messages.create",
    "shopping.view",
    "shopping.create",
    "quotes.view",
    "settings.view",
  ],
};

/**
 * Parse permissions from JSON string
 */
export function parsePermissions(permissionsJson: string | null): Permission[] {
  if (!permissionsJson) return [];
  try {
    return JSON.parse(permissionsJson) as Permission[];
  } catch {
    return [];
  }
}

/**
 * Get user permissions (from custom role, custom permissions, or default role permissions)
 */
export function getUserPermissions(
  user: SessionUser | null, 
  userPermissionsJson?: string | null,
  customRolePermissions?: string | null
): Permission[] {
  if (!user) return [];

  // Priority 1: Custom role permissions (if user is assigned to a custom role)
  if (customRolePermissions) {
    const rolePermissions = parsePermissions(customRolePermissions);
    if (rolePermissions.length > 0) {
      return rolePermissions;
    }
  }

  // Priority 2: User-specific custom permissions
  if (userPermissionsJson) {
    const custom = parsePermissions(userPermissionsJson);
    if (custom.length > 0) {
      return custom;
    }
  }

  // Priority 3: Default permissions for role
  return DEFAULT_PERMISSIONS[user.role] || [];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  user: SessionUser | null,
  permission: Permission,
  userPermissionsJson?: string | null
): boolean {
  const permissions = getUserPermissions(user, userPermissionsJson);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: SessionUser | null,
  permissions: Permission[],
  userPermissionsJson?: string | null
): boolean {
  if (!user) return false;
  const userPermissions = getUserPermissions(user, userPermissionsJson);
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: SessionUser | null,
  permissions: Permission[],
  userPermissionsJson?: string | null
): boolean {
  if (!user) return false;
  const userPermissions = getUserPermissions(user, userPermissionsJson);
  return permissions.every((p) => userPermissions.includes(p));
}

