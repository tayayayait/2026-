import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Copy,
  FileText,
  Printer,
  ShieldAlert,
  Bug,
  Calendar,
  CheckCircle2,
  CloudRain,
  Droplets,
  Info,
  Thermometer,
  Tractor,
  Wind,
} from "lucide-react";
import { AppShell } from "../app-shell";
import { LoadingSteps } from "../loading-steps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import type { GeneratedReportDocument } from "../../domains/reports/report-generation";
import { RiskDashboardSection } from "./risk-dashboard-section";
import { ActionTimelineSection } from "./action-timeline-section";
import { PestRiskCardsSection } from "./pest-risk-cards-section";
import { WeatherScheduleSection } from "./weather-schedule-section";
import { PesticideGuideSection } from "./pesticide-guide-section";
import { MarketAnalysisSection } from "./market-analysis-section";
import { HarvestStrategySection } from "./harvest-strategy-section";
import { FinalChecklistSection } from "./final-checklist-section";

interface ReportDocumentProps {
  farmName?: string;
  reportResult: GeneratedReportDocument | null;
  loadingStep: number | null;
  error: string | null;
}

const renderMarkdown = (text: string) =>
  text.split("\n").map((line, index) => {
    if (line.startsWith("## ")) {
      return (
        <h2
          key={`${line}-${index}`}
          className="mt-6 mb-3 flex items-center gap-2 text-xl font-bold text-primary"
        >
          <FileText className="h-5 w-5" />
          {line.replace(/#|\*/g, "").trim()}
        </h2>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3 key={`${line}-${index}`} className="mt-4 mb-2 text-lg font-bold text-foreground">
          {line.replace(/#|\*/g, "").trim()}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={`${line}-${index}`} className="mb-2 ml-4 text-foreground/90">
          {line.replace(/#|\*/g, "").substring(2).trim()}
        </li>
      );
    }
    if (line.trim() === "" || line.startsWith("<") || line.startsWith("---")) return <br key={`blank-${index}`} />;
    return (
      <p key={`${line}-${index}`} className="mb-2 leading-relaxed text-foreground/90">
        {line.replace(/#|\*/g, "").trim()}
      </p>
    );
  });

const copyReportLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    alert("리포트 링크가 클립보드에 복사되었습니다.");
  } catch {
    alert("링크 복사에 실패했습니다.");
  }
};

const statusLabel: Record<string, string> = {
  LIVE: "실 API 응답",
  EMPTY: "정상 응답·결과 없음",
  FALLBACK: "대체 데이터",
  FAILED: "호출 실패",
};

export const ReportDocument = ({
  farmName,
  reportResult,
  loadingStep,
  error,
}: ReportDocumentProps) => {
  const reportMode = reportResult?.mode;
  const reportWarning = reportResult?.warning;
  const reportData = reportResult?.reportData;
  const inputData = reportResult?.inputData;
  const content = reportResult?.content;

  return (
    <AppShell
      title="AI 맞춤 분석 리포트"
      subtitle={farmName ? `${farmName} 기상 및 병해충 통합 가이드` : ""}
    >
      <div className="print-show mx-auto max-w-4xl space-y-6">
        <div className="flex items-start gap-3 rounded-md border border-yellow-200/60 bg-yellow-50/50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong className="font-semibold">주의사항:</strong> 이 리포트는 공공데이터 기반 의사결정
            보조 자료입니다. 최종 작업 결정은 실제 포장 상태와 현장 판단을 함께 고려해야 합니다.
          </p>
        </div>
        <div className="print-hide flex items-start gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-blue-900">
              {reportMode === "LOCAL_FALLBACK" ? "로컬 규칙 기반 리포트" : "Gemini 농업 의사결정 AI"}
            </h3>
            <p className="text-sm leading-relaxed text-blue-800">
              {reportMode === "LOCAL_FALLBACK"
                ? "외부 AI 응답 없이 공공데이터와 위험도 계산 결과를 조합했습니다."
                : "기상, 농업기상 관측, 병해충 후보 데이터를 종합해 실질적 대응 가이드를 생성합니다."}
            </p>
          </div>
        </div>

        <Card className="border-primary/20 shadow-md">
          <CardHeader className="border-b bg-secondary/30 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{farmName || "농장"} 종합 리포트</CardTitle>
                <CardDescription className="mt-1">
                  발행일시: {new Date().toLocaleDateString("ko-KR")}
                </CardDescription>
              </div>
              <div className="print-hide flex gap-2">
                <button
                  onClick={copyReportLink}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  title="리포트 링크 복사"
                >
                  <Copy className="h-4 w-4" /> 링크
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  title="인쇄 또는 PDF 저장"
                >
                  <Printer className="h-4 w-4" /> PDF 저장
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {reportWarning && loadingStep === 5 ? (
              <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>경고</AlertTitle>
                <AlertDescription>{reportWarning}</AlertDescription>
              </Alert>
            ) : null}

            {loadingStep !== null && loadingStep < 5 ? (
              <div className="flex flex-col items-center justify-center space-y-8 py-16">
                <LoadingSteps currentStep={loadingStep} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
                <ShieldAlert className="h-12 w-12 text-risk-critical-fg" />
                <p className="text-lg font-bold text-foreground">리포트 생성 실패</p>
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm text-muted-foreground">외부 API 응답 상태를 확인해야 합니다.</p>
              </div>
            ) : reportData && inputData ? (
              <div className="space-y-10">
                <RiskDashboardSection data={reportData.riskDashboard} />
                
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-foreground">종합 분석 요약</h2>
                  </div>
                  <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-5 text-blue-900 leading-relaxed text-lg shadow-sm">
                    {reportData.summary}
                  </div>
                </section>

                <ActionTimelineSection data={reportData.actionTimeline} />

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                    <h2 className="text-2xl font-bold text-foreground">주요 위협 요인</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {reportData.topThreats.map((threat, idx) => (
                      <Card key={idx} className="border-red-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                            <Bug className="h-5 w-5" />
                            {threat.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-sm text-foreground/80">
                            <strong className="text-foreground">원인/근거:</strong> {threat.reason}
                          </div>
                          <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800 flex gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{threat.requiredAction}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>

                <PestRiskCardsSection data={reportData.pestRiskCards} />
                
                <WeatherScheduleSection data={reportData.weatherSchedule} />
                
                <PesticideGuideSection data={reportData.pesticideGuide} />
                
                <MarketAnalysisSection data={reportData.marketAnalysis} points={inputData.marketPrice?.points} />
                
                <HarvestStrategySection data={reportData.harvestStrategy} />
                
                {reportData.precautions && reportData.precautions.length > 0 && (
                  <section className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h3 className="text-lg font-bold text-yellow-900">일반 주의사항</h3>
                    </div>
                    <ul className="list-inside list-disc space-y-2 text-yellow-800">
                      {reportData.precautions.map((p, idx) => (
                        <li key={idx} className="text-sm leading-relaxed">{p}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <FinalChecklistSection data={reportData.finalChecklist} />

                {/* 5. 컨텍스트 및 출처 (Accordion) */}
                <section className="mt-12 border-t pt-8">
                  <Accordion type="single" collapsible className="w-full">


                    {inputData.machines && inputData.machines.length > 0 && (
                      <AccordionItem value="machines">
                        <AccordionTrigger className="text-foreground/80 hover:text-foreground">
                          <div className="flex items-center gap-2">
                            <Tractor className="h-4 w-4" />
                            주변 농기계 임대 정보
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 p-2">
                            {inputData.machines.map((machine, idx) => (
                              <li key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <span>{machine.name} <span className="text-muted-foreground text-sm">({machine.centerName})</span></span>
                                <Badge variant="outline">{machine.status}</Badge>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {inputData.sources && inputData.sources.length > 0 && (
                      <AccordionItem value="sources">
                        <AccordionTrigger className="text-foreground/80 hover:text-foreground">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            데이터 수집 출처
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 p-2 text-sm text-muted-foreground">
                            {inputData.sources.map((source, idx) => (
                              <li key={idx} className="flex items-center justify-between">
                                <span>{source.label} {source.note ? `(${source.note})` : ""}</span>
                                <Badge variant="secondary">{statusLabel[source.status] || source.status}</Badge>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </section>
              </div>
            ) : content ? (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-li:leading-relaxed md:prose-base">
                {renderMarkdown(content)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};
