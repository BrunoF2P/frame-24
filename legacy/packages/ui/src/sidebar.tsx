"use client";
import React, { useState, createContext, useContext } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { cn } from "./lib/utils";
import Link from "next/link";

// 1. Context para gerenciar estado do sidebar (colapso e ativo)
const SidebarContext = createContext<{
  activeItem: string | null;
  setActiveItem: (item: string | null) => void;
  activeSubmenuItem: string | null;
  setActiveSubmenuItem: (item: string | null) => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}>({
  activeItem: null,
  setActiveItem: () => {},
  activeSubmenuItem: null,
  setActiveSubmenuItem: () => {},
  isCollapsed: false,
  toggleCollapsed: () => {},
});

// Hook para usar o contexto
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a Sidebar");
  }
  return context;
};

// Sidebar Container Principal
interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activeSubmenuItem, setActiveSubmenuItem] = useState<string | null>(
    null,
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        activeItem,
        setActiveItem,
        activeSubmenuItem,
        setActiveSubmenuItem,
        isCollapsed,
        toggleCollapsed,
      }}
    >
      <aside
        className={cn(
          "h-screen z-20 sidebar-bg border-r sidebar-border flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64",
          className,
        )}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}

// Botão de Colapsar/Expandir
export function SidebarToggle() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <button
      onClick={toggleCollapsed}
      className={cn(
        "absolute top-6 w-6 h-6 rounded-full border sidebar-border shadow-md",
        "sidebar-bg flex items-center justify-center transition-all duration-300",
        "hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "right-0 translate-x-1/2",
      )}
      aria-label={isCollapsed ? "Expandir Sidebar" : "Colapsar Sidebar"}
    >
      {isCollapsed ? (
        <ChevronRightIcon size={16} className="sidebar-icon" />
      ) : (
        <ChevronLeft size={16} className="sidebar-icon" />
      )}
    </button>
  );
}

// Widget para Header do Sidebar
interface SidebarHeaderProps {
  children?: React.ReactNode;
  logo?: React.ReactNode;
  title?: string;
  className?: string;
}

export function SidebarHeader({
  children,
  logo,
  title,
  className,
}: SidebarHeaderProps) {
  const { isCollapsed } = useSidebar();

  if (children) {
    return (
      <div className={cn("border-b sidebar-border relative", className)}>
        {children}
        <SidebarToggle />
      </div>
    );
  }

  return (
    <div className={cn("p-6 border-b sidebar-border relative", className)}>
      <div className="flex items-center gap-3 overflow-hidden">
        {logo || (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
        )}
        {/* Oculta o título quando colapsado - Transição rápida */}
        <h1
          className={cn(
            "font-semibold sidebar-text text-lg whitespace-nowrap transition-opacity duration-100", // Duração de 100ms
            isCollapsed && "opacity-0",
          )}
        >
          {title || "Cinema ERP"}
        </h1>
      </div>
      <SidebarToggle />
    </div>
  );
}

// Container para os itens de navegação
interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  const { isCollapsed } = useSidebar();
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>
      <nav
        className={cn(
          "p-4 space-y-6 transition-all duration-300",
          isCollapsed && "p-2", // Menos padding quando colapsado
        )}
      >
        {children}
      </nav>
    </div>
  );
}

// Seção/Categoria de itens
interface SidebarSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  titleClassName?: string;
}

export function SidebarSection({
  children,
  title,
  className,
  titleClassName,
}: SidebarSectionProps) {
  const { isCollapsed } = useSidebar();
  return (
    <div className={cn("space-y-1", className)}>
      {title &&
        !isCollapsed && ( // Oculta o título quando colapsado
          <div className="mb-3">
            <h3
              className={cn(
                "text-xs font-medium sidebar-text-muted uppercase tracking-wider px-3 transition-opacity duration-300",
                titleClassName,
              )}
            >
              {title}
            </h3>
          </div>
        )}
      {children}
    </div>
  );
}

// Item de navegação individual
interface SidebarItemProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  activeClassName?: string;
}

export function SidebarItem({
  children,
  icon,
  label,
  href,
  isActive,
  hasSubmenu,
  onClick,
  className,
  activeClassName,
}: SidebarItemProps) {
  const {
    activeItem,
    setActiveItem,
    setActiveSubmenuItem,
    isCollapsed,
    toggleCollapsed,
  } = useSidebar();

  const isExpanded = isActive || activeItem === label;

  const isHighlighted = isExpanded;

  const isExpandable = hasSubmenu || children;

  const handleClick = (e: React.MouseEvent) => {
    if (isCollapsed) {
      e.preventDefault();
      e.stopPropagation();
      toggleCollapsed();
      return;
    }

    setActiveSubmenuItem(null);
    onClick?.();

    if (isExpandable) {
      const nextActive = isExpanded ? null : label;
      setActiveItem(nextActive);
    } else {
      setActiveItem(label);

      if (!isCollapsed) {
        toggleCollapsed();
      }
    }
  };

  const baseClasses = cn(
    "w-full flex items-center gap-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg",
    isHighlighted
      ? cn(
          "sidebar-item-active sidebar-text-active border-r-2 border-primary",
          isCollapsed ? "px-2 justify-center" : "px-3",
          activeClassName,
        )
      : cn(
          "sidebar-text-muted hover:sidebar-text hover:sidebar-item-hover",
          isCollapsed ? "px-2 justify-center" : "px-3",
          className,
        ),
  );

  const content = (
    <>
      {icon && (
        <span
          className={cn(
            "flex-shrink-0 transition-colors",
            isHighlighted ? "sidebar-icon-active" : "sidebar-icon",
          )}
        >
          {icon}
        </span>
      )}
      {/* Oculta o label e o indicador de submenu quando colapsado - Transição rápida */}
      <span
        className={cn(
          "flex-1 text-left whitespace-nowrap overflow-hidden",
          "transition-opacity duration-100",
          isCollapsed && "opacity-0 absolute left-20",
        )}
      >
        {label}
      </span>

      {isExpandable && !isCollapsed && (
        <ChevronRight
          size={16}
          className={cn(
            "transition-all duration-300 flex-shrink-0",
            isExpanded && "rotate-90 sidebar-icon-active",
          )}
        />
      )}

      {/* Indicador visual lateral quando colapsado e tem submenu aberto */}
      {isExpandable && isCollapsed && isExpanded && (
        <ChevronRight
          size={16}
          className="absolute right-0 translate-x-full sidebar-icon-active"
        />
      )}
    </>
  );

  const ItemTag =
    isExpandable || !href ? (
      <button onClick={handleClick} className={baseClasses} role="button">
        {content}
      </button>
    ) : (
      <Link href={href} onClick={(e) => handleClick(e)} className={baseClasses}>
        {content}
      </Link>
    );

  return (
    <div>
      {ItemTag}

      {/* Submenu: visível apenas se isExpanded E não colapsado */}
      {children && isExpanded && !isCollapsed && (
        <div className="mt-1 ml-4 space-y-1 animate-in slide-in-from-left-4 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// Submenu Item
interface SidebarSubmenuItemProps {
  icon?: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  activeClassName?: string;
}

export function SidebarSubmenuItem({
  icon,
  label,
  href,
  isActive,
  onClick,
  className,
  activeClassName,
}: SidebarSubmenuItemProps) {
  const {
    activeSubmenuItem,
    setActiveSubmenuItem,
    isCollapsed,
    toggleCollapsed,
  } = useSidebar();

  const isCurrentlyActive = isActive ?? activeSubmenuItem === label;

  const handleClick = () => {
    setActiveSubmenuItem(label);
    onClick?.();

    // LÓGICA DE SUBMENU: Sempre colapsa o Sidebar ao clicar em um item de submenu (ação final)
    if (!isCollapsed) {
      toggleCollapsed();
    }
  };

  return (
    <Link
      href={href || "#"}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 py-2 text-sm rounded-lg transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg",
        isCurrentlyActive
          ? cn(
              "sidebar-item-active sidebar-text-active",
              isCollapsed ? "px-2 justify-center" : "px-3",
              activeClassName,
            )
          : cn(
              "sidebar-text-muted hover:sidebar-text hover:sidebar-item-hover",
              isCollapsed ? "px-2 justify-center" : "px-3",
              className,
            ),
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex-shrink-0 transition-colors",
            isCurrentlyActive ? "sidebar-icon-active" : "sidebar-icon",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 text-left whitespace-nowrap">{label}</span>
    </Link>
  );
}

// Footer do Sidebar
interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        "p-4 border-t sidebar-border transition-all duration-300",
        isCollapsed && "p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Widget de usuário
interface SidebarUserProps {
  name: string;
  email?: string;
  avatar?: string;
  onClick?: () => void;
  className?: string;
}

export function SidebarUser({
  name,
  email,
  avatar,
  onClick,
  className,
}: SidebarUserProps) {
  const { isCollapsed } = useSidebar();
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg hover:sidebar-item-hover cursor-pointer transition-colors",
        isCollapsed ? "justify-center" : "",
        className,
      )}
    >
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />
        ) : (
          <span className="text-primary-foreground text-sm font-medium">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {/* Oculta informações do usuário quando colapsado */}
      {!isCollapsed && (
        <div className="flex-1 min-w-0 transition-opacity duration-300">
          <p className="text-sm font-medium sidebar-text truncate">{name}</p>
          {email && (
            <p className="text-xs sidebar-text-muted truncate">{email}</p>
          )}
        </div>
      )}
    </div>
  );
}
