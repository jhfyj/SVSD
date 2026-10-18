import { cn } from "./cn";

export type Address = { id: string; name: string; detail?: string };

export type AddressListProps = {
  items: Address[];
  onSelect?: (item: Address) => void;
  className?: string;
};

/** Search results under the destination input, split by hairline dividers. */
export function AddressList({ items, onSelect, className }: AddressListProps) {
  return (
    <ul className={cn("divide-y divide-border border border-border", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className="flex w-full flex-col gap-1 px-3 py-3 text-left uppercase hover:bg-surface"
          >
            <span className="text-sm">{item.name}</span>
            {item.detail && <span className="text-[10px] text-foreground/70">{item.detail}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
