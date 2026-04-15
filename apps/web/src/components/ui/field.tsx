import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}

export const Field = ({
  className,
  ...props
}: FieldProps) => (
  <div className={cn("space-y-2.5", className)} {...props} />
);

export const FieldLabel = ({
  className,
  ...props
}: FieldLabelProps) => (
  <label
    className={cn("text-sm font-medium text-foreground-muted", className)}
    {...props}
  />
);

export const FieldDescription = ({
  className,
  ...props
}: FieldDescriptionProps) => (
  <p className={cn("text-xs text-foreground-muted", className)} {...props} />
);
