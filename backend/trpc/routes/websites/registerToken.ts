import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { registerNotificationToken, DEFAULT_USER_ID } from './notificationService';

export const registerTokenProcedure = publicProcedure
  .input(z.object({
    token: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { token } = input;
    
    try {
      registerNotificationToken(DEFAULT_USER_ID, token);
      return { success: true, message: 'Notification token registered successfully' };
    } catch (error) {
      console.error('Error registering notification token:', error);
      throw new Error('Failed to register notification token');
    }
  });