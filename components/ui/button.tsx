import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-[background-color,transform] active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-[0_3px_10px_rgba(200,70,60,0.12)] hover:bg-[#ad3931]",
        outline: "border border-border bg-white text-foreground hover:bg-muted",
        ghost: "hover:bg-muted text-foreground",
        secondary: "bg-[#fff0ed] text-primary hover:bg-[#ffe5df]",
        destructive: "bg-red-50 text-red-700 hover:bg-red-100",
      },
      size: { default: "h-12 px-5", sm: "h-11 px-3", lg: "h-13 px-7", icon: "h-11 w-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
