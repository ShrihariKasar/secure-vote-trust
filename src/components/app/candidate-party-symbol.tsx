import React from "react";
import { Vote, Image as ImageIcon } from "lucide-react";

interface CandidatePartySymbolProps {
  symbol?: string | null | undefined;
  symbolImage?: string | null | undefined;
  className?: string | undefined;
  badgeClassName?: string | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  showLabel?: boolean | undefined;
}

/**
 * Renders Indian candidate party symbols, handling both:
 * 1. ECI Party Emoji/Text Symbols (e.g. 🪷 Lotus (कमल / BJP))
 * 2. Custom Party Symbols uploaded from device (Base64 data:image or URL)
 */
export function CandidatePartySymbol({
  symbol,
  symbolImage,
  className = "",
  badgeClassName = "",
  size = "sm",
  showLabel = true,
}: CandidatePartySymbolProps) {
  const rawSymbol = symbol || "🪷 Lotus (कमल / BJP)";
  
  // Detect if either symbolImage or symbol itself is a base64 / URL image
  const isImage = 
    Boolean(symbolImage && (symbolImage.startsWith("data:image/") || symbolImage.startsWith("http"))) ||
    rawSymbol.startsWith("data:image/") ||
    rawSymbol.startsWith("http://") ||
    rawSymbol.startsWith("https://");

  const imageUrl = symbolImage && (symbolImage.startsWith("data:image/") || symbolImage.startsWith("http"))
    ? symbolImage
    : isImage ? rawSymbol : null;

  // Extract display label if rawSymbol is an image or contains metadata
  const displayLabel = isImage 
    ? (symbol && !symbol.startsWith("data:image/") && !symbol.startsWith("http") ? symbol : "Uploaded Party Symbol")
    : rawSymbol;

  const imgSizeClass = size === "lg" ? "size-8" : size === "md" ? "size-6" : "size-4";
  const textSizeClass = size === "lg" ? "text-sm" : size === "md" ? "text-xs" : "text-[11px]";

  if (imageUrl) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary-soft/60 px-2 py-0.5 text-xs font-medium text-foreground shadow-xs ${badgeClassName}`}
      >
        <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded bg-white/20 p-0.5 border border-primary/30">
          <img
            src={imageUrl}
            alt="Party Icon"
            className={`${imgSizeClass} object-contain`}
          />
        </span>
        {showLabel && (
          <>
            <span className="text-[10px] text-muted-foreground">Sign / Symbol:</span>
            <span className={`font-semibold text-primary truncate max-w-[150px] ${textSizeClass}`}>
              {displayLabel}
            </span>
          </>
        )}
      </span>
    );
  }

  // Preset Indian Election Commission Party Symbol
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary-soft/60 px-2 py-0.5 text-xs font-medium text-foreground shadow-xs ${badgeClassName}`}
    >
      <Vote className="size-3 text-primary shrink-0" />
      {showLabel && <span className="text-[10px] text-muted-foreground">Sign / Symbol:</span>}
      <span className={`font-semibold text-primary truncate ${textSizeClass}`}>
        {rawSymbol}
      </span>
    </span>
  );
}
