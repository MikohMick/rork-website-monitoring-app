# Website Monitoring App - EAS Build Setup Guide

## Prerequisites

1. Install EAS CLI globally:
```bash
npm install -g @expo/eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

## Environment Configuration

1. Create a `.env` file in your project root:
```bash
# Backend API Base URL (required)
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-backend-url.com

# Optional: Development API URL
EXPO_PUBLIC_DEV_API_URL=http://localhost:8081

# App Configuration
EXPO_PUBLIC_APP_NAME="Website Monitoring App"
EXPO_PUBLIC_APP_VERSION="1.0.0"
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
EXPO_PUBLIC_DEBUG_MODE=false
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

### Common Issues:

1. **"Failed to resolve plugin for module 'expo-router'"**
   - Ensure `expo-router` is properly installed
   - Check that `babel.config.js` includes `expo-router/babel`

2. **Push Notifications Not Working**
   - Push notifications don't work in Expo Go (SDK 53+)
   - Use development builds or production builds
   - The app gracefully handles this limitation

3. **Backend Connection Issues**
   - Verify `EXPO_PUBLIC_RORK_API_BASE_URL` is set correctly
   - Check that your backend is accessible from the internet
   - Ensure CORS is properly configured

4. **Build Failures**
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

1. Set up your backend (Rork or custom)
2. Configure environment variables
3. Run `eas build:configure` (if not already done)
4. Build preview APK: `eas build --platform android --profile preview`
5. Download and test the APK
6. For production: `eas build --platform android --profile production`

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Ensure your backend is properly deployed and accessible
4. Check Expo CLI and EAS CLI are up to date