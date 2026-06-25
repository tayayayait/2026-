import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStepsProps {
  currentStep: number;
}

const LOADING_MESSAGES = [
  "주소 좌표를 확인하는 중",
  "기상 데이터를 불러오는 중",
  "병해충 정보를 분석하는 중",
  "농기계 정보를 찾는 중",
  "AI 리포트를 생성하는 중",
];

export function LoadingSteps({ currentStep }: LoadingStepsProps) {
  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {LOADING_MESSAGES.map((message, index) => {
        const isCompleted = currentStep > index;
        const isCurrent = currentStep === index;
        const isPending = currentStep < index;

        return (
          <div
            key={message}
            className={cn(
              "flex items-center gap-3 transition-opacity duration-300",
              isPending ? "opacity-40" : "opacity-100",
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : isCurrent ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
            )}

            <span
              className={cn(
                "text-sm font-medium",
                isCurrent ? "text-primary" : "text-foreground/80",
              )}
            >
              {message}
              {isCurrent && <span className="animate-pulse">...</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
