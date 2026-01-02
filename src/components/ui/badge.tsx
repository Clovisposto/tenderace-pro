import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-success/30 bg-success/20 text-success",
        warning: "border-warning/30 bg-warning/20 text-warning",
        apta: "border-success/30 bg-success/20 text-success font-bold",
        ressalva: "border-warning/30 bg-warning/20 text-warning font-bold",
        inapta: "border-destructive/30 bg-destructive/20 text-destructive font-bold",
        portal: "border-accent/30 bg-accent/20 text-accent",
        modalidade: "border-primary/30 bg-primary/20 text-primary",
        status: "border-muted-foreground/30 bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
