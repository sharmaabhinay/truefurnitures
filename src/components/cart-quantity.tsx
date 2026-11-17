import { Minus, Plus } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { MAX_LINE_QTY } from "@/lib/cart-lines";

type Props = {
  /** The cart line this control edits. */
  line: CartItem;
  /** Optional deposit figure shown under the count. */
  deposit?: number;
  className?: string;
};

/**
 * Shown in place of "Add to Cart" when the exact same configuration is already
 * in the cart: minus removes one (the line disappears at zero), plus adds one.
 */
export function CartQuantityControl({ line, deposit, className = "" }: Props) {
  const { changeQty } = useCart();

  return (
    <div
      className={`flex items-stretch border-2 border-primary bg-background ${className}`}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label={`Remove one ${line.name} from cart`}
        title="Remove one"
        onClick={() => changeQty(line.id, -1)}
        className="h-auto self-stretch rounded-none px-5 sm:px-7 text-primary hover:bg-primary hover:text-primary-foreground"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </Button>

      <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-4 text-center">
        <span
          aria-live="polite"
          className="text-[11px] sm:text-xs font-bold uppercase tracking-widest leading-none"
        >
          {line.quantity} in cart
        </span>
        {deposit ? (
          <span className="mt-1.5 text-[9px] uppercase tracking-widest text-muted-foreground truncate">
            Deposit {formatINR(deposit)}
          </span>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        aria-label={`Add one ${line.name} to cart`}
        title="Add one"
        disabled={line.quantity >= MAX_LINE_QTY}
        onClick={() => changeQty(line.id, 1)}
        className="h-auto self-stretch rounded-none px-5 sm:px-7 text-primary hover:bg-primary hover:text-primary-foreground"
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </Button>
    </div>
  );
}
