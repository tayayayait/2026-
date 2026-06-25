import { Link } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const AdminAccessGate = ({ loading }: { loading: boolean }) => (
  <AppShell
    title={loading ? "관리자 권한 확인 중" : "관리자 인증 필요"}
    subtitle="지역 운영 정보는 승인된 관리자만 조회할 수 있습니다."
  >
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4">
      <Card className="w-full border-dashed">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <LockKeyhole className="h-6 w-6 text-primary" />
            )}
          </div>
          <h2 className="font-semibold">
            {loading ? "로그인 상태를 확인하고 있습니다" : "관리자 계정으로 로그인하세요"}
          </h2>
          {!loading && (
            <Link
              to="/login"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              관리자 로그인
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  </AppShell>
);
