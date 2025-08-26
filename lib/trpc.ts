import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // Check for Rork backend URL first (preferred)
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback to development server for local development
  if (__DEV__) {
    // For Expo development server
    if (process.env.EXPO_PUBLIC_DEV_API_URL) {
      return process.env.EXPO_PUBLIC_DEV_API_URL;
    }
    // Default local development URL
    return "http://localhost:8081";
  }

  // Production fallback - this should be set in your build environment
  throw new Error(
    "No base URL found. Please set EXPO_PUBLIC_RORK_API_BASE_URL environment variable."
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});