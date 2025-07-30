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
  BarChart,
  GalleryHorizontalEndIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminSidebar({ 
  navItems: initialNavItems, 
  showLogout = true, 
  onLogout 
}: {
  navItems: Omit<NavItem, 'icon'>[];
  showLogout?: boolean;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Color palette based on #97CCDD (base color)
  const colors = {
    base: "#97CCDD",
    light: "#C1E3ED",
    dark: "#6FB5CC",
    darker: "#4A9EBB",
    complementary: "#DDC497", // Warm beige for contrast
    accent: "#DD97CC", // Soft pink for highlights
    text: "#2D3748",
    textLight: "#F8FAFC"
  };

  // Map icons to nav items
  const iconMap: Record<string, React.ReactNode> = {
    Dashboard: <LayoutDashboard className="h-5 w-5" />,
    Member: <Users className="h-5 w-5" />,
    Products: <Package className="h-5 w-5" />,
    Orders: <ShoppingCart className="h-5 w-5" />,
    Laporan: <BarChart className="h-5 w-5" />,
    Settings: <Settings className="h-5 w-5" />,
    Documentation: <FileText className="h-5 w-5" />,
    Galeri: <GalleryHorizontalEndIcon className="h-5 w-5" />
  };

  const navItems: NavItem[] = initialNavItems.map(item => ({
    ...item,
    icon: iconMap[item.label] || <FileText className="h-5 w-5" />
  }));

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (!isMounted) {
    return (
      <aside className={cn(
        `bg-gradient-to-b from-[${colors.darker}] to-[${colors.dark}] text-[${colors.textLight}] min-h-screen py-6 px-4 transition-all duration-300 ease-in-out`,
        isCollapsed ? "w-20" : "w-64"
      )}></aside>
    );
  }

  return (
    <motion.aside
      initial={{ x: 0 }}
      animate={{ 
        width: isCollapsed ? "5rem" : "16rem",
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
      className={cn(
      `bg-gradient-to-b from-[${colors.darker}] to-[${colors.dark}] text-[${colors.textLight}] min-h-screen py-6 px-4 shadow-xl relative`,
      isMobile ? "hidden" : "block" // Hide completely on mobile
    )}
    >
      {/* Collapse Button */}
      <motion.button 
        onClick={toggleSidebar}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`absolute -right-3 top-6 rounded-full bg-[${colors.light}] p-1 shadow-md hover:bg-[${colors.base}] transition-colors z-10`}
      >
        {isCollapsed ? (
          <ChevronRight className={`h-5 w-5 text-[${colors.darker}]`} />
        ) : (
          <ChevronLeft className={`h-5 w-5 text-[${colors.darker}]`} />
        )}
      </motion.button>

      {/* Logo/Brand */}
      <motion.div 
        className="flex items-center justify-center mb-8 overflow-hidden"
        layout
      >
        {isCollapsed ? (
          <Image
            src="/grindup-logo.png"
            alt="Grind Up"
            width={36}
            height={36}
            className="rounded-lg object-contain"
            priority
          />
        ) : (
          <div className="flex items-center gap-3">
            <Image
              src="/grindup-logo.png"
              alt="Grind Up"
              width={160}
              height={40}
              className="object-contain"
              priority
            />
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: isCollapsed ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link
              href={item.href}
              className={cn(
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-[${colors.base}]/50 group`,
                pathname === item.href && `bg-[${colors.base}] font-medium`,
                isCollapsed ? "justify-center" : "justify-start"
              )}
            >
              <span className={cn(
                "transition-colors",
                pathname === item.href ? `text-[${colors.textLight}]` : `text-[${colors.light}] group-hover:text-[${colors.textLight}]`
              )}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </nav>

      {/* Logout Button - Placed at bottom */}
      {showLogout && (
        <motion.div 
          className="mt-auto pt-4"
          layout
        >
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              `flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-[${colors.accent}]/90 to-[${colors.complementary}]/90 hover:from-[${colors.accent}] hover:to-[${colors.complementary}] text-[${colors.textLight}] transition-colors`,
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && "Logout"}
          </motion.button>
        </motion.div>
      )}

      {/* Collapsed Tooltips */}
      {isCollapsed && !isMobile && (
        <div className="hidden md:block">
          {navItems.map((item, index) => (
            <div 
              key={`tooltip-${index}`}
              className={`absolute left-full ml-4 px-3 py-2 bg-[${colors.dark}] text-[${colors.textLight}] text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
              style={{ top: `${6.5 + index * 4}rem` }}
            >
              {item.label}
              <div className={`absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-[${colors.dark}] transform rotate-45`}></div>
            </div>
          ))}
        </div>
      )}
    </motion.aside>
  );
}