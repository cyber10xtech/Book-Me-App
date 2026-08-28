import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl px-4 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "border-0 outline-none ring-0",
        "transition-shadow duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      style={{
        background: "hsl(var(--background))",
        boxShadow: "var(--shadow-inset)",
      }}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
