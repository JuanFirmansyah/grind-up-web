// src/components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  BarChart
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminSidebar({ 
  navItems: initialNavItems, 
  showLogout = false, 
  onLogout 
}: {
  navItems: Omit<NavItem, 'icon'>[];
  showLogout?: boolean;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Map icons to nav items
  const iconMap: Record<string, React.ReactNode> = {
    Dashboard: <LayoutDashboard className="h-5 w-5" />,
    Member: <Users className="h-5 w-5" />,
    Products: <Package className="h-5 w-5" />,
    Orders: <ShoppingCart className="h-5 w-5" />,
    Laporan: <BarChart className="h-5 w-5" />,
    Settings: <Settings className="h-5 w-5" />,
    Documentation: <FileText className="h-5 w-5" />
  };

  const navItems: NavItem[] = initialNavItems.map(item => ({
    ...item,
    icon: iconMap[item.label] || <FileText className="h-5 w-5" />
  }));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Ganti bagian loading state dengan ini:
  if (isLoading) {
    return (
      <aside className={cn(
        "bg-gradient-to-b from-blue-700 to-blue-800 text-white min-h-screen py-6 px-4 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64",
        isMobile && "fixed z-50 h-full"
      )}>
        <div className="flex flex-col space-y-8">
          {/* Logo Skeleton */}
          <div className={cn(
            "h-8 bg-blue-600 rounded animate-pulse",
            isCollapsed ? "w-10 mx-auto" : "w-40"
          )} />
          
          {/* Menu Items Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={cn(
                  "h-10 bg-blue-600 rounded animate-pulse",
                  isCollapsed ? "w-10 mx-auto" : "w-full"
                )} 
              />
            ))}
          </div>
          
          {/* Logout Button Skeleton */}
          {showLogout && (
            <div className={cn(
              "h-10 bg-red-500/50 rounded animate-pulse mt-6",
              isCollapsed ? "w-10 mx-auto" : "w-full"
            )} />
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn(
      "bg-gradient-to-b from-blue-700 to-blue-800 text-white min-h-screen py-6 px-4 transition-all duration-300 ease-in-out shadow-xl",
      isCollapsed ? "w-20" : "w-64",
      isMobile && "fixed z-50 h-full"
    )}>
      {/* Collapse Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 rounded-full bg-white p-1 shadow-md hover:bg-gray-100 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5 text-blue-800" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-blue-800" />
        )}
      </button>

      {/* Logo/Brand */}
      <div className="flex items-center justify-center mb-8 overflow-hidden">
        {isCollapsed ? (
          <Image
            src="/grindup-logo.png" // path icon kecil, wajib ada di public/
            alt="Grind Up"
            width={36}
            height={36}
            className="rounded-lg object-contain"
            priority
          />
        ) : (
          <div className="flex items-center gap-3">
            <Image
              src="/grindup-logo.png" // path logo full, wajib ada di public/
              alt="Grind Up"
              width={160}
              height={40}
              className="object-contain"
              priority
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-blue-600/50 group",
              pathname === item.href && "bg-blue-600 font-medium",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <span className={cn(
              "transition-colors",
              pathname === item.href ? "text-white" : "text-blue-200 group-hover:text-white"
            )}>
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className="whitespace-nowrap">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      {showLogout && (
        <button
          onClick={onLogout}
          className={cn(
            "flex items-center gap-3 w-full mt-6 px-4 py-3 rounded-lg bg-red-600/90 hover:bg-red-700 text-white transition-colors",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && "Logout"}
        </button>
      )}

      {/* Collapsed Tooltips */}
      {isCollapsed && (
        <div className="hidden md:block">
          {navItems.map((item, index) => (
            <div 
              key={`tooltip-${index}`}
              className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ top: `${6.5 + index * 4}rem` }}
            >
              {item.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 transform rotate-45"></div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}