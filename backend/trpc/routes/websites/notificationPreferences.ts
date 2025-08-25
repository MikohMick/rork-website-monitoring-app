import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { setNotificationPreference, getNotificationPreferences, DEFAULT_USER_ID } from './notificationService';

export const setNotificationPreferenceProcedure = publicProcedure
  .input(z.object({
    websiteId: z.string(),
    enabled: z.boolean(),
  }))
  .mutation(async ({ input }) => {
    const { websiteId, enabled } = input;
    
    setNotificationPreference(DEFAULT_USER_ID, websiteId, enabled);
    
    return { 
      success: true, 
      message: `Notifications ${enabled ? 'enabled' : 'disabled'} for website` 
    };
  });

export const getNotificationPreferencesProcedure = publicProcedure
  .query(async () => {
    const preferences = getNotificationPreferences(DEFAULT_USER_ID);
    return { preferences };
  });