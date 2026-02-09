#!/bin/bash

# Setup Environment Variables for Bermann TMS Automation
echo "🔧 Setting up environment for Bermann TMS QA Automation..."
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "✅ .env already exists"
    echo "   If you want to recreate it, delete .env first and run this script again"
    echo ""
    exit 0
fi

# Create .env from template
if [ ! -f .env.example ]; then
    echo "❌ ERROR: .env.example not found"
    echo "   Please make sure .env.example exists in the root directory"
    exit 1
fi

echo "📝 Creating .env from .env.example template..."
cp .env.example .env
echo "✅ .env created successfully"
echo ""

echo "⚠️  IMPORTANT: You need to edit .env with your credentials!"
echo ""
echo "Required fields to update:"
echo "  1. TEST_ADMIN_USER     (your admin username)"
echo "  2. TEST_ADMIN_PASS     (your admin password)"
echo "  3. TEST_REGULAR_USER   (your regular username)"
echo "  4. TEST_REGULAR_PASS   (your regular password)"
echo "  5. GEMINI_API_KEY      (optional - not currently used)"
echo "  6. OPENAI_API_KEY      (optional - not currently used)"
echo ""
echo "Edit with:"
echo "  nano .env"
echo "  # or"
echo "  code .env"
echo "  # or"
echo "  cursor .env"
echo ""
echo "✅ Setup complete! Don't forget to edit .env before running tests."