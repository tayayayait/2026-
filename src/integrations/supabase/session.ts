import type { AuthenticatedUser } from "@/domains/auth/role";
import { toAuthenticatedUser } from "@/domains/auth/role";
import { supabase } from "./client";

let identityRequest: Promise<AuthenticatedUser | null> | null = null;

const requestIdentity = async (): Promise<AuthenticatedUser | null> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return null;
    if (sessionData.session?.user) return toAuthenticatedUser(sessionData.session.user);

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return null;
    return toAuthenticatedUser(data.user);
  } catch {
    return null;
  }
};

export const ensureSupabaseIdentity = async (): Promise<AuthenticatedUser | null> => {
  if (typeof window === "undefined") return null;
  if (identityRequest) return identityRequest;

  identityRequest = requestIdentity();
  try {
    return await identityRequest;
  } finally {
    identityRequest = null;
  }
};
