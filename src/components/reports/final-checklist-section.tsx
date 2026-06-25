import { CheckSquare } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";

interface FinalChecklistSectionProps {
  data: string[];
}

export const FinalChecklistSection = ({ data }: FinalChecklistSectionProps) => {
  if (!data || data.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="h-6 w-6 text-teal-600" />
        <h2 className="text-2xl font-bold text-foreground">최종 행동 체크리스트</h2>
      </div>

      <Card className="border-2 border-teal-100 bg-white shadow-sm overflow-hidden">
        <div className="bg-teal-50 px-6 py-3 border-b border-teal-100">
          <p className="text-sm font-medium text-teal-800">
            리포트를 다 읽으신 후 지금 당장 수행해야 할 항목입니다. 완료 후 체크해보세요.
          </p>
        </div>
        <CardContent className="p-6">
          <ul className="space-y-4">
            {data.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <Checkbox id={`checklist-${idx}`} className="mt-1 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600" />
                <label 
                  htmlFor={`checklist-${idx}`} 
                  className="text-lg font-medium text-foreground leading-snug cursor-pointer peer-data-[state=checked]:text-muted-foreground peer-data-[state=checked]:line-through transition-all"
                >
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
};
