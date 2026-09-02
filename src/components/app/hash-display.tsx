import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HashDisplay({
  value,
  label,
  truncate = true,
  className,
}: {
  value: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
      <code
        className="hash min-w-0 truncate rounded-md border border-border bg-muted px-1.5 py-0.5 text-foreground"
        title={value}
      >
        {truncate ? truncateHash(value) : value}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${label ?? "value"}`}
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </Button>
      <span className="sr-only" role="status">
        {copied ? `${label ?? "Value"} copied to clipboard` : ""}
      </span>
    </span>
  );
}
