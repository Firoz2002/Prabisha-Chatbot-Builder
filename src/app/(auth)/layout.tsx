"use client";
import { useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Loader from '@/components/layout/loader';
import RecaptchaProvider from '@/providers/recaptcha-provider';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();  
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push('/chatbots');
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <Loader />;
  }

  if (status === "authenticated") {
    return null; 
  }

  return (
    <RecaptchaProvider>
      {children}
    </RecaptchaProvider>
  );
}