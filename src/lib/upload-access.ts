export function canUploadToFolder(role: string, folder: string): boolean {
  return role === "admin" || role === "staff" || folder === "orders/references";
}