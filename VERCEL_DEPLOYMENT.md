# Vercel Deployment Guide for GullyCricketX

## Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- Supabase project configured

## Vercel Setup Steps

### 1. Connect Your Repository
1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your `agtechapp` repository
4. Configure the following settings:

### 2. Project Settings
- **Framework Preset:** Other
- **Root Directory:** `./` (leave empty)
- **Build Command:** `npm run build`
- **Output Directory:** `web-build`
- **Install Command:** `npm install`

### 3. Environment Variables
In Vercel dashboard, add these environment variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Build Configuration
The `vercel.json` file configures:
- Static build from `web-build` directory
- SPA routing (all routes serve index.html)
- Environment variable mapping

### 5. Deploy
1. Vercel will automatically build your Expo app
2. Static files will be generated in `web-build/`
3. Your app will be available at your Vercel URL

## Important Notes

- This deploys the **web version** of your React Native app
- Mobile apps (iOS/Android) need separate builds via Expo
- The web version provides a responsive web interface
- All Supabase features will work in the web version

## Troubleshooting

If deployment fails:
1. Check environment variables are set correctly
2. Ensure Supabase URL and keys are valid
3. Check Vercel build logs for errors
4. Verify all dependencies are in package.json

## Build Process

1. **Install dependencies:** `npm install`
2. **Build static files:** `expo export --platform web`
3. **Output directory:** `web-build/`
4. **Deploy:** Vercel serves static files

## Custom Domain

You can add a custom domain in Vercel dashboard:
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Configure DNS settings 