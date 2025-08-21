import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient" | "modern" | "glass"
  size?: "default" | "sm" | "lg" | "icon" | "xl"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 relative overflow-hidden",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5": variant === "default",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5": variant === "destructive",
            "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/30 shadow-md hover:shadow-xl transform hover:-translate-y-1 backdrop-blur-sm": variant === "outline",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md hover:shadow-lg transform hover:-translate-y-0.5": variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground rounded-xl backdrop-blur-sm": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
            "bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-1 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out": variant === "gradient",
            "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105": variant === "modern",
            "bg-white/80 backdrop-blur-md border border-white/30 text-gray-700 hover:bg-white/90 hover:border-white/50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5": variant === "glass",
          },
          {
            "h-10 px-4 py-2 text-sm": size === "default",
            "h-8 rounded-lg px-3 text-xs": size === "sm",
            "h-12 rounded-xl px-8 text-base font-bold": size === "lg",
            "h-14 rounded-2xl px-10 text-lg font-bold": size === "xl",
            "h-10 w-10 rounded-xl": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {variant === "gradient" && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
