import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:shadow-md",
        outline: "text-foreground border-2 hover:bg-accent hover:text-accent-foreground",
        pink: "border-transparent bg-pink-100 text-pink-800 hover:bg-pink-200 hover:shadow-md",
        tag: "border-transparent bg-gradient-to-r from-pink-100 via-rose-50 to-red-100 text-pink-700 hover:from-pink-200 hover:via-rose-100 hover:to-red-200 hover:shadow-lg hover:scale-105 active:scale-95",
        success: "border-transparent bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md",
        warning: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md",
        info: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-md",
        gradient: "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
