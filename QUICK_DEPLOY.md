# Quick Deployment Guide

## 🚀 Fast Track Deployment

### Web Deployment (Ready Now!)
Your app is already configured for web deployment on Vercel.

```bash
# Deploy to web immediately
npm run deploy:web
```

**Or manually:**
1. Push your code to GitHub
2. Connect to Vercel (vercel.com)
3. Import your repository
4. Deploy automatically

### Mobile Apps (Setup Required)

#### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

#### 2. Login to Expo
```bash
eas login
```

#### 3. Configure EAS Build
```bash
eas build:configure
```

#### 4. Build Apps
```bash
# iOS
npm run build:ios

# Android  
npm run build:android

# Both platforms
npm run build:all
```

## 📋 Pre-Deployment Checklist

### ✅ Immediate (Required)
- [ ] Environment variables configured
- [ ] Supabase database is accessible
- [ ] App builds without errors (`npm run build`)

### ✅ For Mobile Apps
- [ ] Apple Developer Account ($99/year for iOS)
- [ ] Google Play Developer Account ($25 one-time for Android)
- [ ] App icons and splash screens ready
- [ ] EAS CLI installed and configured

### ✅ For Production
- [ ] Custom domain configured (optional)
- [ ] Analytics and monitoring setup
- [ ] App store metadata prepared
- [ ] Privacy policy and terms of service

## 🔧 Quick Commands

```bash
# Development deployment
npm run deploy:dev

# Production web deployment  
npm run deploy:web

# Check TypeScript
npm run type-check

# Run linting
npm run lint

# Start development server
npm start
```

## 🌍 Access URLs

- **Development**: http://localhost:8081
- **Web (Vercel)**: Will be provided after deployment
- **Expo Go**: Scan QR code from `npm start`

## 🆘 Need Help?

1. **Web Issues**: Check Vercel dashboard and logs
2. **Mobile Issues**: Check EAS build logs at expo.dev
3. **Database Issues**: Check Supabase dashboard
4. **General**: See full DEPLOYMENT_GUIDE.md

## 📱 Test Your Deployment

### Web Testing
1. Open the deployed URL
2. Test user registration/login
3. Test core features (teams, matches, chat)
4. Test on mobile browsers

### Mobile Testing
1. Install on physical device
2. Test offline functionality
3. Test push notifications
4. Test device-specific features

## 🔄 Rollback Plan

**Web**: Revert via Vercel dashboard → Previous deployments
**Mobile**: Release previous version via app stores

---

**Ready to deploy?** Start with: `npm run deploy:web`