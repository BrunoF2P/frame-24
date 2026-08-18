"use client";
import React from "react";
import { cn } from "./lib/utils";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItemProps {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  label,
  href,
  isCurrent,
}) => (
  <>
    <a
      href={href}
      className={cn(
        "text-sm transition-colors",
        isCurrent
          ? "text-foreground font-medium"
          : "text-foreground-muted hover:text-primary",
      )}
      aria-current={isCurrent ? "page" : undefined}
    >
      {label}
    </a>
    {!isCurrent && (
      <ChevronRight
        size={14}
        className="text-foreground-muted mx-2 flex-shrink-0"
      />
    )}
  </>
);

interface BreadcrumbProps {
  items: { label: string; href: string }[];
  currentLabel: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, currentLabel }) => {
  return (
    <nav className="flex items-center text-sm" aria-label="Breadcrumb">
      <BreadcrumbItem label="Home" href="/" />
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <BreadcrumbItem label={item.label} href={item.href} />
        </React.Fragment>
      ))}
      <BreadcrumbItem label={currentLabel} isCurrent />
    </nav>
  );
};

interface PageHeaderProps {
  title: string;
  breadcrumbItems: { label: string; href: string }[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbItems,
  actions,
}) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 sidebar-bg sidebar-border backdrop-blur-sm border-b border-border transition-all duration-300 w-full",
        "pt-1 pb-4 px-6 md:px-8",
      )}
    >
      <Breadcrumb items={breadcrumbItems} currentLabel={title} />
      <div className="flex items-center justify-between mt-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {actions && (
          <div className="flex items-center space-x-2">{actions}</div>
        )}
      </div>
    </header>
  );
};
