"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  FileText, 
  BookOpen, 
  Palette, 
  Zap, 
  Sparkles, 
  Pen, 
  CircleFadingPlus,
  List,
  Settings,
} from "lucide-react";
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "@/components/ui/button";

// Static menu items
const MENU_ITEMS = [
  {
    title: "Instructions",
    icon: FileText,
    url: "/instructions",
  },
  {
    title: "Knowledge",
    icon: BookOpen,
    url: "/knowledge",
  },
  {
    title: "Logic",
    icon: List,
    url: "/logic",
  },
  {
    title: "Theme",
    icon: Palette,
    url: "/theme",
  },
  {
    title: "Integrations",
    icon: Zap,
    url: "/integrations",
  },
  {
    title: "AI Model",
    icon: Sparkles,
    url: "/ai-model",
  },
  {
    title: "Settings",
    icon: Settings,
    url: "/settings",
  },
];

export default function Sidebar() {
    const pathname = usePathname();
  return (
    <SidebarComponent collapsible="icon" className="z-20 border-r bg-gradient-to-b from-background to-muted/5">
        <SidebarHeader className="flex flex-col items-center justify-center relative px-4 py-5 border-b border-border/50 bg-gradient-to-r from-background to-muted/10">
            {/* Expanded State */}
            <div className="group-data-[state=collapsed]:hidden flex flex-col items-center justify-center w-full space-y-3 transition-all duration-300">
                {/* Logo Section */}
                <div className="flex items-center justify-center w-full relative">
                    <Image
                        src="/logo.png"
                        alt="default logo"
                        className="object-contain transition-all duration-300 dark:brightness-0 dark:invert hover:scale-105"
                        width={140}
                        height={45}
                        priority
                    />
                </div>

                {/* Site Name */}
                <div className="text-center space-y-1">
                    <h1 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                        Prabisha Chatbot Builder
                    </h1>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        Powered by{" "}
                        <Link
                            href="https://prabisha.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline transition-colors flex items-center gap-1"
                        >
                            Prabisha
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                        </Link>
                    </p>
                </div>
            </div>

            {/* Collapsed State */}
            <div className="group-data-[state=expanded]:hidden absolute inset-0 flex items-center justify-center">
                <div>
                    <Image
                        src="/logo.png"
                        alt="default logo"
                        className="object-contain dark:brightness-0 dark:invert hover:scale-110 transition-transform"
                        width={36}
                        height={36}
                        priority
                    />
                </div>
            </div>

            {/* Sidebar Trigger */}
            <SidebarTrigger className="h-7 w-7 rounded-full absolute z-50 top-6 -right-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg border transition-all duration-300 hover:scale-110" />
        </SidebarHeader>

        {/* Navigation Menu */}
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarGroup className="group/sidebar-group p-0">
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center gap-0">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        size="lg"
                        isActive={isActive}
                        className="border-b border-collapse p-8 relative group/menubutton transition-all duration-200 hover:bg-accent/80 hover:shadow-sm hover:border-accent rounded-none"
                      >
                        <Link href={item.url}>
                          <Icon className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover/menubutton:text-foreground'}`} />
                          <span className="group-data-[collapsible=icon]:sr-only font-medium">
                            {item.title}
                          </span>
                          
                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
    </SidebarComponent>
  );
}