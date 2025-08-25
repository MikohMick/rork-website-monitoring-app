import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/hooks/useTheme";
import { WebsiteMonitorProvider } from "@/hooks/useWebsiteMonitorBackend";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "@/lib/trpc";
import { useNotifications } from "@/hooks/useNotifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  useNotifications(); // Initialize notifications
  
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="website/[id]" options={{ headerShown: true }} />
      <Stack.Screen name="notifications" options={{ headerShown: true }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <WebsiteMonitorProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </WebsiteMonitorProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}