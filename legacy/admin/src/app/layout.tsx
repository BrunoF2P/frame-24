import "./globals.css";
import { AdminShell } from "@/components/layout/admin-shell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="flex h-screen overflow-hidden bg-background text-foreground">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
