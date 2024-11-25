// src/components/ui/button.tsx
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "default" | "destructive" | "outline";
}

export function Button({
  children,
  onClick,
  className,
  disabled,
  type = "button",
  variant = "default",
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  
  const variantStyles = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground"
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseStyles,
        variantStyles[variant],
        "h-9 px-4 py-2",
        className
      )}
    >
      {children}
    </button>
  )
}