import { useEffect } from "react";
import { create } from "zustand";
import type { AuthenticatedUser } from "@/domains/auth/role";
import { toAuthenticatedUser } from "@/domains/auth/role";
import { supabase } from "@/integrations/supabase/client";
import { ensureSupabaseIdentity } from "@/integrations/supabase/session";

interface AuthState {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    const user = await ensureSupabaseIdentity();
    set({
      user,
      loading: false,
      error: user ? null : "Supabase 인증을 사용할 수 없어 브라우저 저장소로 동작합니다.",
    });
  },

  signInWithPassword: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      set({ loading: false, error: "이메일 또는 비밀번호를 확인하세요." });
      return false;
    }
    set({ user: toAuthenticatedUser(data.user), loading: false, error: null });
    return true;
  },

  signOut: async () => {
    set({ loading: true, error: null });
    await supabase.auth.signOut();
    const user = await ensureSupabaseIdentity();
    set({
      user,
      loading: false,
      error: user ? null : "로그아웃 후 익명 세션 생성에 실패했습니다.",
    });
  },
}));

export const useAuthInit = () => {
  useEffect(() => {
    void useAuthStore.getState().initialize();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.setState({
        user: session?.user ? toAuthenticatedUser(session.user) : null,
        loading: false,
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);
};
