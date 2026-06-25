import { Badge } from "@/components/ui/badge";
import { ImageOff, Loader2 } from "lucide-react";
import type { PestDetailPanel } from "@/domains/pests/detail-selection";

interface PhotoSearchDetailProps {
  detail: PestDetailPanel | null;
  loading: boolean;
  error: string | null;
}

const DetailField = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{value}</p>
    </div>
  );
};

export const PhotoSearchDetail = ({ detail, loading, error }: PhotoSearchDetailProps) => {
  if (loading) {
    return (
      <div className="flex min-h-56 items-center justify-center border-l-0 border-border px-6 lg:border-l">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-56 items-center justify-center border-l-0 border-border px-6 text-center text-sm text-destructive lg:border-l">
        {error}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center border-l-0 border-border px-6 text-center lg:border-l">
        <ImageOff className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">사진 후보를 선택하면 상세정보가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="border-l-0 border-border p-5 lg:border-l">
      <div className="flex flex-col gap-5">
        {detail.imageUrl && (
          <img
            src={detail.imageUrl}
            alt={detail.title}
            className="aspect-[4/3] w-full rounded-md border object-cover"
          />
        )}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{detail.title}</h2>
            <Badge variant="secondary">{detail.type}</Badge>
          </div>
          <DetailField label={detail.primaryLabel} value={detail.primaryText} />
          <DetailField label={detail.secondaryLabel} value={detail.secondaryText} />
          <DetailField label="방제방법" value={detail.preventionText} />
          {detail.additionalDetails.map((field) => (
            <DetailField
              key={`${detail.id}-${field.label}`}
              label={field.label}
              value={field.text}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
