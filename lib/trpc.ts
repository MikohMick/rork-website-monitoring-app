import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('Using Rork backend URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location?.origin) {
        console.log('Using same-origin for web:', window.location.origin);
        return window.location.origin;
      }
    }
  } catch (e) {
    console.log('Platform/window detection failed', e);
  }

  if (process.env.EXPO_PUBLIC_DEV_API_URL) {
    console.log('Using dev API URL:', process.env.EXPO_PUBLIC_DEV_API_URL);
    return process.env.EXPO_PUBLIC_DEV_API_URL;
  }

  if (__DEV__) {
    console.log('Using default localhost URL http://localhost:3000');
    return "http://localhost:3000";
  }

  console.warn('No base URL configured, defaulting to relative');
  return "";
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
          return response as Response;
        } catch (error) {
          console.error('tRPC fetch network error:', error);
          throw error;
        }
      },
    }),
  ],
});