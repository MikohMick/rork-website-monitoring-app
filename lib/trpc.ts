import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // Check for Rork backend URL first (preferred)
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('Using Rork backend URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback to development server for local development
  if (__DEV__) {
    // For Expo development server
    if (process.env.EXPO_PUBLIC_DEV_API_URL) {
      console.log('Using dev API URL:', process.env.EXPO_PUBLIC_DEV_API_URL);
      return process.env.EXPO_PUBLIC_DEV_API_URL;
    }
    // Default local development URL
    console.log('Using default localhost URL');
    return "http://localhost:8081";
  }

  // Production fallback - this should be set in your build environment
  throw new Error(
    "No base URL found. Please set EXPO_PUBLIC_RORK_API_BASE_URL environment variable."
  );
};

const baseUrl = getBaseUrl();
const apiUrl = `${baseUrl}/api/trpc`;
console.log('tRPC API URL:', apiUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: apiUrl,
      transformer: superjson,
      fetch: async (url, options) => {
        console.log('tRPC fetch request:', url);
        try {
          const response = await fetch(url, options);
          console.log('tRPC fetch response status:', response.status);
          if (!response.ok) {
            console.error('tRPC fetch error:', response.status, response.statusText);
          }
          return response;
        } catch (error) {
          console.error('tRPC fetch network error:', error);
          throw error;
        }
      },
    }),
  ],
});