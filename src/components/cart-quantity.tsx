import { Minus, Plus } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";
import { formatINR } from "@/lib/format";

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
      className={`flex items-stretch border-2 border-[color:var(--brand-dark)] bg-white ${className}`}
    >
      <button
        type="button"
        aria-label={`Remove one ${line.name} from cart`}
        onClick={() => changeQty(line.id, -1)}
        className="grid place-items-center px-5 sm:px-7 text-[color:var(--brand-dark)] transition-colors hover:bg-[color:var(--brand-dark)] hover:text-white"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>

      <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-4 text-center">
        <span
          aria-live="polite"
          className="text-[11px] sm:text-xs font-bold uppercase tracking-widest leading-none"
        >
          {line.quantity} in cart
        </span>
        {deposit ? (
          <span className="mt-1.5 text-[9px] uppercase tracking-widest text-[color:var(--brand-dark)]/50 truncate">
            Deposit {formatINR(deposit)}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={`Add one ${line.name} to cart`}
        onClick={() => changeQty(line.id, 1)}
        className="grid place-items-center px-5 sm:px-7 text-[color:var(--brand-dark)] transition-colors hover:bg-[color:var(--brand-dark)] hover:text-white"
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
