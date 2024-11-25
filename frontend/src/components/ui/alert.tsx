// src/components/ui/alert.tsx
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface AlertProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "destructive";
}

export function Alert({
  children,
  className,
  variant = "default",
}: AlertProps) {
  const baseStyles = "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground"
  
  const variantStyles = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
  }

  return (
    <div
      role="alert"
      className={cn(
        baseStyles,
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  )
}

export function AlertTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h5
      className={cn(
        "mb-1 font-medium leading-none tracking-tight",
        className
      )}
    >
      {children}
    </h5>
  )
}

export function AlertDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm [&_p]:leading-relaxed",
        className
      )}
    >
      {children}
    </div>
  )
}