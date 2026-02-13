import Script from "next/script";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import GoogleOneTap from "@/components/features/GoogleOneTap";
import { SSOProvider } from "@/providers/sso-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prabisha Chatbots",
  description: "Build and customize AI chatbots with ease using Prabisha's intuitive platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <Script
                  id="chatbot-loader"
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: `
                      (function(w,d,s,o,f,js,fjs){
                        w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
                        js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
                        js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
                      }(window,document,'script','chatbot','http://localhost:3000/embed.js'));

                      chatbot('init', {
                        chatbotId: 'cmkky862a000004l1rbz63cn7',
                        baseUrl: 'http://localhost:3000'
                      });
                    `
                  }}
                />
            <SessionProvider>
              { process.env.NODE_ENV !== "development" && <GoogleOneTap /> }
              <Toaster richColors position="top-right" closeButton />
              <SSOProvider>
                {children}
              </SSOProvider>
            </SessionProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}
