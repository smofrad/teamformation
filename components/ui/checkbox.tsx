"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { checked?: boolean }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      className={cn("h-4 w-4 rounded border-border text-primary focus:ring-ring", className)}
      {...props}
    />
  );
}
