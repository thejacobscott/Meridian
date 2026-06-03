import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
          {icon}
        </div>
      )}
      <h3 className="text-xl">{title}</h3>
      {body && (
        <p className="mt-2 max-w-sm text-ink-soft text-balance">{body}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
