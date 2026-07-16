"use client";
import { AppProvider } from "@/lib/store";
import AuthGate, { useAuth } from "@/components/AuthGate";
import Shell from "@/components/Shell";
import ClientPortal from "@/components/ClientPortal";

function Inner() {
  const { session } = useAuth();
  return session?.role === "client" ? <ClientPortal /> : <Shell />;
}

export default function Page() {
  return (
    <AuthGate>
      <AppProvider>
        <Inner />
      </AppProvider>
    </AuthGate>
  );
}
