# Website Monitor - Supabase Setup Guide

## Database Setup

This app uses Supabase as the backend database. Follow these steps to set up the database:

### 1. Create the websites table

In your Supabase dashboard, go to the SQL Editor and run this SQL command:

```sql
CREATE TABLE websites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'checking',
  uptime INTEGER NOT NULL DEFAULT 0,
  downtime INTEGER NOT NULL DEFAULT 0,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uptime_percentage REAL DEFAULT 0,
  last_error TEXT
);
```

### 2. Enable Row Level Security (Optional)

For better security, you can enable RLS:

```sql
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can make this more restrictive)
CREATE POLICY "Allow all operations" ON websites
  FOR ALL USING (true);
```

### 3. Enable Realtime (Optional)

To enable real-time updates:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE websites;
```

## Environment Variables

The app is already configured with the Supabase credentials:
- URL: `https://xoohhcndzvwthzfdqgjz.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## EAS Build Setup (Optional)

### Prerequisites

1. Install EAS CLI globally:
```bash
npm install -g @expo/eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

## Build Configuration

### 1. Initialize EAS Build
```bash
eas build:configure
```

### 2. Build APK for Testing
```bash
# Build preview APK
eas build --platform android --profile preview

# Build production AAB
eas build --platform android --profile production
```

### 3. Build for iOS (if needed)
```bash
eas build --platform ios --profile preview
```

## Backend Integration Options

### Option 1: Rork Backend (Recommended)
- Set `EXPO_PUBLIC_RORK_API_BASE_URL` to your Rork backend URL
- All tRPC endpoints will work automatically
- CORS is properly configured

### Option 2: Custom Backend
- Deploy the backend folder to your preferred hosting service
- Update the environment variable accordingly
- Ensure CORS is enabled for your domain

## Build Profiles

The project supports three build profiles:

1. **Development**: For development builds with debugging
2. **Preview**: For internal testing (generates APK)
3. **Production**: For app store submission (generates AAB)

## Troubleshooting

### Supabase Database Issues:

1. **"relation 'websites' does not exist"**
   - This means the table hasn't been created yet
   - Run the SQL command above in your Supabase dashboard
   - Go to SQL Editor and paste the CREATE TABLE command

2. **"Could not find the 'downtime' column"**
   - This means the table exists but has different columns
   - Drop the existing table: `DROP TABLE websites;`
   - Recreate it with the SQL above, or add missing columns

3. **"Failed to add website" or "[object Object]" errors**
   - Check the browser console for detailed error messages
   - Verify all required columns exist in your table
   - Make sure the table structure matches exactly

4. **Connection errors**
   - Check that your Supabase project is active
   - Verify the URL and API key are correct
   - Test your internet connection
   - Check Supabase service status

### Common Build Issues:

5. **"Failed to resolve plugin for module 'expo-router'"**
   - Ensure `expo-router` is properly installed
   - Check that `babel.config.js` includes `expo-router/babel`

6. **Push Notifications Not Working**
   - Push notifications don't work in Expo Go (SDK 53+)
   - Use development builds or production builds
   - The app gracefully handles this limitation

7. **Build Failures**
   - Check that all dependencies are compatible with Expo SDK 53
   - Verify app.json configuration is valid
   - Ensure no restricted native modules are used

## Features Preserved

✅ Website monitoring with real-time status checks
✅ Dark/light mode toggle
✅ Push notifications (in development/production builds)
✅ CORS-free backend checking
✅ Responsive UI with proper navigation
✅ Error boundaries and proper error handling
✅ TypeScript support with strict type checking

## Deployment Steps

### For Supabase Setup:
1. Create a Supabase project at https://supabase.com
2. Run the SQL commands above to create the `websites` table
3. The app is already configured with credentials - just test it!
4. (Optional) Enable RLS and realtime features

### For Building APK:
1. Run `eas build:configure` (if not already done)
2. Build preview APK: `eas build --platform android --profile preview`
3. Download and test the APK
4. For production: `eas build --platform android --profile production`

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Ensure your backend is properly deployed and accessible
4. Check Expo CLI and EAS CLI are up to date