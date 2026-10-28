"use client";
import * as React from "react";
import { Popover as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
function Popover(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />;
}
function PopoverTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="popover-trigger" {...props} />;
}
function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export { Popover, PopoverTrigger, PopoverContent };
