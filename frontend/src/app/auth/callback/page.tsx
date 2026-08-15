"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (!access) {
      setError("Missing access token from OAuth provider.");
      return;
    }

    setTokens(access, refresh || undefined);
    router.replace("/dashboard");
  }, [router, searchParams]);

  return (
    <PageShell className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-foreground/50">
        {error || "Signing you in…"}
      </p>
    </PageShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <PageShell className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-foreground/50">Signing you in…</p>
        </PageShell>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
