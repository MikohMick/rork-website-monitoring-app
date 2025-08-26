import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
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

// Test backend connection
const testBackendConnection = async () => {
  try {
    console.log('Testing backend connection to:', baseUrl);
    const response = await fetch(`${baseUrl}/api`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Backend connection test successful:', data);
      return true;
    } else {
      console.error('Backend connection test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
};

// Test connection on startup
testBackendConnection();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: apiUrl,
      transformer: superjson,
      headers: () => ({
        'Content-Type': 'application/json',
      }),
      fetch: async (url, options) => {
        console.log('tRPC fetch request:', url);
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
          });
          console.log('tRPC fetch response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('tRPC fetch error:', response.status, response.statusText, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

// Create a standalone tRPC client for non-React usage
export const standaloneClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: apiUrl,
      transformer: superjson,
      headers: () => ({
        'Content-Type': 'application/json',
      }),
    }),
  ],
});