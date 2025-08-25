import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import addWebsite from "./routes/websites/addWebsite";
import getWebsites from "./routes/websites/getWebsites";
import deleteWebsite from "./routes/websites/deleteWebsite";
import checkWebsite from "./routes/websites/checkWebsite";
import checkAllWebsites from "./routes/websites/checkAllWebsites";
import { registerTokenProcedure } from "./routes/websites/registerToken";
import { setNotificationPreferenceProcedure, getNotificationPreferencesProcedure } from "./routes/websites/notificationPreferences";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  websites: createTRPCRouter({
    add: addWebsite,
    getAll: getWebsites,
    delete: deleteWebsite,
    check: checkWebsite,
    checkAll: checkAllWebsites,
  }),
  notifications: createTRPCRouter({
    registerToken: registerTokenProcedure,
    setPreference: setNotificationPreferenceProcedure,
    getPreferences: getNotificationPreferencesProcedure,
  }),
});

export type AppRouter = typeof appRouter;