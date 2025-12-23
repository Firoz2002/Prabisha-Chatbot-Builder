import React from 'react'
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/components/layout/sidebar';

export default function UserLayout({ children }: { children: React.ReactNode}) {
  return (
    <SidebarProvider>
        <Sidebar />
        {children}
    </SidebarProvider>
  )
}
