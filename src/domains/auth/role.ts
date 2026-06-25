export type UserRole = "FARMER" | "ADMIN";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: UserRole;
  isAnonymous: boolean;
}

interface SupabaseUserIdentity {
  id: string;
  email?: string;
  app_metadata?: unknown;
  is_anonymous?: boolean;
}

export const resolveUserRole = (appMetadata: unknown): UserRole => {
  if (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    "role" in appMetadata &&
    appMetadata.role === "ADMIN"
  ) {
    return "ADMIN";
  }
  return "FARMER";
};

export const toAuthenticatedUser = (user: SupabaseUserIdentity): AuthenticatedUser => ({
  id: user.id,
  ...(user.email ? { email: user.email } : {}),
  role: resolveUserRole(user.app_metadata),
  isAnonymous: user.is_anonymous === true,
});

export const canAccessAdmin = (user: Pick<AuthenticatedUser, "role"> | null): boolean =>
  user?.role === "ADMIN";
