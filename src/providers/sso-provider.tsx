"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

export function SSOProvider({ children } : { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("central-auth", { redirect: false, prompt: "none" });
    }
  }, [status]);

  return <>{children}</>;
}