import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = ButtonProps & {
  loading?: boolean;
  loadingText?: string;
};

/**
 * Button that auto-disables and shows a spinner while `loading` is true.
 * Prevents accidental double-submits. Wrap async handlers with useState/setLoading.
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ loading, loadingText = "Aguarde...", disabled, children, className, ...rest }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn("press-scale", className)}
        {...rest}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";
