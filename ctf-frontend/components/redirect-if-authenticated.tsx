"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";

/**
 * RedirectIfAuthenticated
 *
 * Guest-only page guard (e.g. `/login`). If the current user is already
 * authenticated, redirect them to their home page instead of rendering
 * the guest content. Auth truth comes from the AuthProvider (which
 * validates against `/api/user/me` on the backend) — never from
 * client-side cookie presence, per the project's middleware-neutrality
 * principle.
 *
 * The spinner only covers the INITIAL auth resolution (first hard load
 * of the page). After that we keep children mounted even while
 * `isLoading` is true, because AuthProvider also sets `isLoading` during
 * `login()` submissions — unmounting children then would destroy the
 * form's error state before it can be displayed on a failed login.
 */
export default function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth, isLoading } = useAuth();
  const router = useRouter();
  const [hasResolved, setHasResolved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHasResolved(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && auth.isAuthenticated) {
      router.replace(auth.isAdmin ? "/admin" : "/challenges");
    }
  }, [auth.isAuthenticated, auth.isAdmin, isLoading, router]);

  if (isLoading && !hasResolved) {
    return (
      <div
        role="status"
        aria-label="Checking authentication"
        className="flex justify-center items-center min-h-[calc(100vh-4rem)]"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return null; // will redirect in useEffect
  }

  return <>{children}</>;
}
