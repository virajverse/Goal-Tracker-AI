import React from "react";
import AdminShell from "@/react-app/components/admin/AdminShell";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell requireRole="agent">{children}</AdminShell>;
}
