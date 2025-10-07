import React from "react";
import AdminShell from "@/react-app/components/admin/AdminShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell requireRole="admin">{children}</AdminShell>;
}
