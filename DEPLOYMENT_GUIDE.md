# Deployment Guide for Cricket Community Management App

## Project Overview

**Application Name**: Cricket Community Management App (user-app-53)
**Type**: Cross-platform React Native/Expo application
**Framework**: Expo SDK 53 with React Native 0.79.5
**Backend**: Supabase PostgreSQL with real-time features

## Platform Support

This application supports deployment across multiple platforms:

### 1. Web Deployment (Current - Vercel)
- **Platform**: Vercel
- **Build Command**: `npx expo export --platform web`
- **Output Directory**: `dist`
- **Framework**: Metro bundler with single output
- **Status**: ✅ Currently configured

### 2. Mobile App Deployment

#### iOS App Store
- **Platform**: Apple App Store
- **Requirements**: 
  - Apple Developer Program membership ($99/year)
  - Expo Application Services (EAS) Build
  - iOS device for testing
- **Bundle ID**: `com.appacella.userapp`

#### Google Play Store
- **Platform**: Google Play Console
- **Requirements**:
  - Google Play Developer Account ($25 one-time)
  - EAS Build configuration
  - Android device for testing
- **Package Name**: `com.appacella.userapp`

#### Expo Go (Development/Testing)
- **Platform**: Expo Go app
- **Requirements**: Expo CLI and account
- **Purpose**: Development and testing

## Deployment Configurations

### Current Configuration

#### Web (Vercel)
```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist", 
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npx expo start --web"
}
```

#### Expo Configuration
```json
{
  "expo": {
    "name": "user-app",
    "slug": "user-app", 
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait",
    "scheme": "user-app"
  }
}
```

## Deployment Requirements

### Environment Variables
- **SUPABASE_URL**: `https://jjzqynriluakcomgqjuz.supabase.co`
- **SUPABASE_ANON_KEY**: Authentication key (currently hardcoded)

### Database Dependencies
- Supabase PostgreSQL instance
- Real-time subscriptions enabled
- RLS policies configured
- OAuth providers configured

### Asset Requirements
- App icons (iOS/Android/Web)
- Splash screens
- Favicon for web

## Deployment Steps

### Web Deployment (Vercel)
1. Connect GitHub repository to Vercel
2. Configure build settings (already done)
3. Deploy automatically on git push
4. Custom domain configuration (optional)

### Mobile App Deployment

#### Prerequisites
1. Install EAS CLI: `npm install -g @expo/eas-cli`
2. Login to Expo: `eas login`
3. Configure EAS project: `eas build:configure`

#### iOS Deployment
1. **Development Build**:
   ```bash
   eas build --platform ios --profile development
   ```

2. **Production Build**:
   ```bash
   eas build --platform ios --profile production
   ```

3. **App Store Submission**:
   ```bash
   eas submit --platform ios
   ```

#### Android Deployment
1. **Development Build**:
   ```bash
   eas build --platform android --profile development
   ```

2. **Production Build**:
   ```bash
   eas build --platform android --profile production
   ```

3. **Play Store Submission**:
   ```bash
   eas submit --platform android
   ```

## Security Considerations

### Current Issues to Address
1. **Hardcoded Supabase Keys**: Move to environment variables
2. **OAuth Configuration**: Ensure proper redirect URLs
3. **RLS Policies**: Verify all database policies are secure

### Recommended Security Updates
1. Create `.env` file for sensitive data
2. Configure environment variables in deployment platforms
3. Implement proper error handling for production
4. Set up monitoring and analytics

## Monitoring & Analytics

### Recommended Tools
1. **Expo Analytics**: Built-in usage analytics
2. **Sentry**: Error tracking and performance monitoring
3. **Supabase Dashboard**: Database and API monitoring
4. **Vercel Analytics**: Web performance monitoring

## Scaling Considerations

### Database Scaling
- Supabase automatically scales PostgreSQL
- Monitor connection limits and performance
- Consider database indexing optimization

### File Storage
- Supabase Storage for user uploads
- CDN configuration for static assets
- Image optimization for mobile

### Real-time Features
- Monitor Supabase real-time connection limits
- Implement connection pooling if needed
- Consider message queuing for high traffic

## Cost Estimation

### Development (Free Tier)
- **Vercel**: Free tier sufficient for moderate traffic
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Expo**: Free development builds

### Production (Paid Tiers)
- **Vercel Pro**: $20/month for team features
- **Supabase Pro**: $25/month for production features
- **Apple Developer**: $99/year
- **Google Play**: $25 one-time
- **EAS Build**: $29/month for team builds

## Next Steps

1. **Immediate**: Configure environment variables
2. **Short-term**: Set up EAS Build for mobile apps
3. **Medium-term**: Implement monitoring and analytics
4. **Long-term**: Optimize for scale and performance

## Support & Documentation

- **Expo Documentation**: https://docs.expo.dev/
- **Supabase Documentation**: https://supabase.com/docs
- **Vercel Documentation**: https://vercel.com/docs
- **React Native Documentation**: https://reactnative.dev/docs

## Emergency Contacts & Rollback

### Rollback Procedures
1. **Web**: Revert to previous Vercel deployment
2. **Mobile**: Release previous app version via stores
3. **Database**: Supabase point-in-time recovery

### Backup Strategy
- Database: Supabase automated backups
- Code: Git version control
- Assets: Cloud storage backup