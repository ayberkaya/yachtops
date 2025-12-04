#!/bin/bash

# YachtOps Deployment Script
# Bu script projeyi Vercel'e deploy eder

set -e

echo "🚀 YachtOps Deployment Script"
echo "=============================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI bulunamadı. Kurulum yapılıyor..."
    npm install -g vercel
fi

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo "📝 Değişiklikler commit ediliyor..."
    git add .
    read -p "Commit mesajı (Enter for default): " commit_msg
    commit_msg=${commit_msg:-"Deploy to production"}
    git commit -m "$commit_msg"
fi

# Push to GitHub
echo "📤 GitHub'a push ediliyor..."
git push origin main || git push origin master

# Deploy to Vercel
echo "🚀 Vercel'e deploy ediliyor..."
vercel --prod

echo ""
echo "✅ Deploy tamamlandı!"
echo "📱 Link hazır ve paylaşılabilir!"
echo ""
echo "💡 Not: Environment variables'ları Vercel dashboard'dan kontrol edin."

