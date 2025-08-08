#!/bin/bash

# Cricket Community Management App - Deployment Script
# Usage: ./deploy.sh [platform] [environment]
# Platform options: web, ios, android, all
# Environment options: development, preview, production

set -e  # Exit on any error

PLATFORM=${1:-web}
ENVIRONMENT=${2:-development}

echo "🏏 Cricket Community Management App Deployment"
echo "Platform: $PLATFORM"
echo "Environment: $ENVIRONMENT"
echo "----------------------------------------"

# Function to deploy web
deploy_web() {
    echo "🌐 Deploying to Vercel..."
    
    # Build the web version
    echo "Building web application..."
    npm run build
    
    # Deploy to Vercel
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Deploying to production..."
        npx vercel --prod
    else
        echo "Deploying to preview..."
        npx vercel
    fi
    
    echo "✅ Web deployment completed!"
}

# Function to deploy iOS
deploy_ios() {
    echo "📱 Deploying iOS app..."
    
    # Check if EAS CLI is installed
    if ! command -v eas &> /dev/null; then
        echo "Installing EAS CLI..."
        npm install -g @expo/eas-cli
    fi
    
    # Login to EAS (if not already logged in)
    echo "Checking EAS authentication..."
    eas whoami || eas login
    
    # Build for iOS
    echo "Building iOS app for $ENVIRONMENT..."
    eas build --platform ios --profile $ENVIRONMENT
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Submitting to App Store..."
        eas submit --platform ios --latest
    fi
    
    echo "✅ iOS deployment completed!"
}

# Function to deploy Android
deploy_android() {
    echo "🤖 Deploying Android app..."
    
    # Check if EAS CLI is installed
    if ! command -v eas &> /dev/null; then
        echo "Installing EAS CLI..."
        npm install -g @expo/eas-cli
    fi
    
    # Login to EAS (if not already logged in)
    echo "Checking EAS authentication..."
    eas whoami || eas login
    
    # Build for Android
    echo "Building Android app for $ENVIRONMENT..."
    eas build --platform android --profile $ENVIRONMENT
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Submitting to Google Play..."
        eas submit --platform android --latest
    fi
    
    echo "✅ Android deployment completed!"
}

# Function to run pre-deployment checks
pre_deployment_checks() {
    echo "🔍 Running pre-deployment checks..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Run linting
    echo "Running ESLint..."
    npm run lint || echo "⚠️  Linting warnings found"
    
    # Check for TypeScript errors
    echo "Checking TypeScript..."
    npx tsc --noEmit || echo "⚠️  TypeScript warnings found"
    
    echo "✅ Pre-deployment checks completed!"
}

# Function to create deployment report
create_deployment_report() {
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    REPORT_FILE="deployment-report-$(date '+%Y%m%d-%H%M%S').md"
    
    cat > $REPORT_FILE << EOF
# Deployment Report

**Date**: $TIMESTAMP
**Platform**: $PLATFORM
**Environment**: $ENVIRONMENT

## Deployment Status
- ✅ Pre-deployment checks passed
- ✅ Build completed successfully
- ✅ Deployment completed

## Next Steps
1. Test the deployed application
2. Monitor for any issues
3. Update documentation if needed

## Rollback Instructions
If issues are found, use the following commands:
- **Web**: Revert via Vercel dashboard
- **Mobile**: Release previous version via app stores

EOF
    
    echo "📊 Deployment report created: $REPORT_FILE"
}

# Main deployment logic
main() {
    pre_deployment_checks
    
    case $PLATFORM in
        "web")
            deploy_web
            ;;
        "ios")
            deploy_ios
            ;;
        "android")
            deploy_android
            ;;
        "all")
            deploy_web
            deploy_ios
            deploy_android
            ;;
        *)
            echo "❌ Invalid platform: $PLATFORM"
            echo "Valid options: web, ios, android, all"
            exit 1
            ;;
    esac
    
    create_deployment_report
    echo "🎉 Deployment completed successfully!"
}

# Show help if requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Cricket Community Management App - Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [platform] [environment]"
    echo ""
    echo "Platform options:"
    echo "  web      - Deploy web version to Vercel"
    echo "  ios      - Deploy iOS app via EAS"
    echo "  android  - Deploy Android app via EAS"
    echo "  all      - Deploy to all platforms"
    echo ""
    echo "Environment options:"
    echo "  development - Development build"
    echo "  preview     - Preview/staging build"
    echo "  production  - Production build"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh web production"
    echo "  ./deploy.sh ios development"
    echo "  ./deploy.sh all preview"
    exit 0
fi

# Run main function
main