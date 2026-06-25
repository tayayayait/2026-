import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoSearchListItem {
  id: string;
  name: string;
  imageUrl?: string;
  meta?: string;
  disabled?: boolean;
}

interface PhotoSearchListProps {
  title: string;
  items: PhotoSearchListItem[];
  selectedId?: string;
  loading?: boolean;
  emptyText: string;
  hasMore?: boolean;
  onSelect: (id: string) => void;
  onLoadMore?: () => void;
}

export const PhotoSearchList = ({
  title,
  items,
  selectedId,
  loading,
  emptyText,
  hasMore,
  onSelect,
  onLoadMore,
}: PhotoSearchListProps) => (
  <section className="min-w-0">
    <div className="flex h-12 items-center justify-between border-b border-border px-4">
      <h2 className="text-sm font-bold">{title}</h2>
      <Badge variant="outline">{items.length}</Badge>
    </div>

    {loading && items.length === 0 ? (
      <div className="flex min-h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ) : items.length === 0 ? (
      <div className="flex min-h-44 items-center justify-center px-5 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    ) : (
      <div className="max-h-[34rem] overflow-y-auto p-2">
        <div className="space-y-1">
          {items.map((item) => {
            const selected = selectedId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors",
                  selected
                    ? "border-primary/30 bg-primary/10"
                    : "hover:border-border hover:bg-muted/60",
                  item.disabled && "cursor-not-allowed opacity-55",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  {item.meta && (
                    <div className="mt-1 truncate text-xs text-muted-foreground">{item.meta}</div>
                  )}
                </div>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
        {hasMore && onLoadMore && (
          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-full"
            disabled={loading}
            onClick={onLoadMore}
          >
            {loading ? <Loader2 className="animate-spin" /> : <ChevronDown />}더 보기
          </Button>
        )}
      </div>
    )}
  </section>
);
