import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";


export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('Using Rork backend URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL.replace(/\/$/, '');
  }

  // Fallback to the deployed backend
  const fallbackUrl = 'https://workspace-n6g0f7vla-michaels-projects-c8a13e6f.vercel.app';
  console.log('Using fallback backend URL:', fallbackUrl);
  return fallbackUrl;
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