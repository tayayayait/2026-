import { AlertTriangle, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface RiskDashboardSectionProps {
  data: {
    riskLevelText: string;
    coreReason: string;
    urgency: string;
  };
}

const getRiskColors = (level: string) => {
  if (level.includes("심각") || level.includes("위험")) {
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      icon: <ShieldAlert className="h-8 w-8 text-red-600" />,
      badge: "bg-red-100 text-red-800",
    };
  }
  if (level.includes("주의") || level.includes("경고")) {
    return {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-900",
      icon: <AlertTriangle className="h-8 w-8 text-orange-600" />,
      badge: "bg-orange-100 text-orange-800",
    };
  }
  if (level.includes("관심") || level.includes("준비")) {
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-900",
      icon: <Info className="h-8 w-8 text-yellow-600" />,
      badge: "bg-yellow-100 text-yellow-800",
    };
  }
  return {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-900",
    icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
    badge: "bg-green-100 text-green-800",
  };
};

export const RiskDashboardSection = ({ data }: RiskDashboardSectionProps) => {
  const colors = getRiskColors(data.riskLevelText);

  return (
    <Card className={`border-2 ${colors.border} ${colors.bg} shadow-sm`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center justify-center rounded-full bg-white p-4 shadow-sm">
            {colors.icon}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className={`text-2xl font-bold ${colors.text}`}>
                {data.riskLevelText}
              </h2>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${colors.badge}`}>
                {data.urgency}
              </span>
            </div>
            <p className={`text-lg ${colors.text} opacity-90`}>{data.coreReason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
