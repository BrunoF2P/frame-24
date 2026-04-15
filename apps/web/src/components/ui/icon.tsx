import * as React from "react";
import { iconRegistry, type IconName } from "@/lib/icon-registry";

const iconSizes = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
} as const;

type IconScale = keyof typeof iconSizes;

interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: IconScale | number;
  decorative?: boolean;
  strokeWidth?: number;
}

export const Icon = ({
  name,
  size = "sm",
  decorative = true,
  strokeWidth = 2,
  ...props
}: IconProps) => {
  const Component = iconRegistry[name];
  const resolvedSize = typeof size === "number" ? size : iconSizes[size];

  return (
    <Component
      size={resolvedSize}
      strokeWidth={strokeWidth}
      aria-hidden={decorative ? true : undefined}
      {...props}
    />
  );
};
