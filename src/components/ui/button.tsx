import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-all duration-150 select-none -webkit-tap-highlight-color:transparent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "neu-primary rounded-2xl text-white tracking-wide active:scale-[0.97]",
        secondary: "rounded-2xl text-foreground active:scale-[0.97]",
        destructive: "rounded-2xl text-white active:scale-[0.97]",
        ghost: "hover:bg-accent rounded-xl active:scale-95",
        outline: "rounded-2xl text-foreground ring-2 ring-border active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm:      "h-9 px-4 text-xs rounded-xl",
        lg:      "h-14 px-8 text-base",
        icon:    "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const neuStyle: React.CSSProperties =
      !variant || variant === "default"
        ? { background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }
        : variant === "secondary"
        ? { background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }
        : variant === "destructive"
        ? { background: "hsl(var(--destructive))", boxShadow: "4px 4px 10px rgba(239,68,68,0.3)" }
        : variant === "outline"
        ? { background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }
        : {};
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref}
        style={{ ...neuStyle, ...style }} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
