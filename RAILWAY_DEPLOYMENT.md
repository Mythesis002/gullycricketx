# Railway Deployment Guide for GullyCricketX

## Prerequisites
- Railway account
- GitHub repository connected to Railway
- Supabase project configured

## Railway Setup Steps

### 1. Connect Your Repository
1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `agtechapp` repository

### 2. Configure Environment Variables
In Railway dashboard, add these environment variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_EXPO_PROJECT_ID=your_expo_project_id
PORT=3000
```

### 3. Build Settings
Railway will automatically detect the configuration from:
- `railway.json` - Build and deploy settings
- `nixpacks.toml` - Node.js and build process
- `Procfile` - Process definition

### 4. Deploy
1. Railway will automatically build and deploy your app
2. The web version will be available at your Railway URL
3. Mobile apps can still be built using Expo

## Important Notes

- This deploys the **web version** of your React Native app
- Mobile apps (iOS/Android) need to be built separately using Expo
- The web version provides a responsive web interface
- All Supabase features will work in the web version

## Troubleshooting

If deployment fails:
1. Check environment variables are set correctly
2. Ensure Supabase URL and keys are valid
3. Check Railway logs for build errors
4. Verify all dependencies are in package.json 