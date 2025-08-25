import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).location?.origin) {
    return (window as any).location.origin as string;
  }

  return "http://localhost:8081";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});