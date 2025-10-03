#!/bin/bash

# Cleanup script for old/unused Supabase Edge Functions
# This script removes functions that are deployed but no longer exist in the codebase

echo "🧹 Cleaning up old Supabase Edge Functions..."
echo ""

# List of old functions to remove (deployed but not in current codebase)
OLD_FUNCTIONS=(
  "getUsageStats"
  "stripeWebhook"
  "adminStats"
  "createCheckout"
  "createCustomPlan"
  "createReview"
  "reconsile"
  "get-user-profile"
)

echo "The following functions will be deleted from your Supabase project:"
for func in "${OLD_FUNCTIONS[@]}"; do
  echo "  - $func"
done
echo ""

read -p "Do you want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Cleanup cancelled."
  exit 0
fi

# Delete each function
for func in "${OLD_FUNCTIONS[@]}"; do
  echo "🗑️  Deleting function: $func"
  
  # Try to delete the function
  if supabase functions delete "$func" --project-ref cqvufndxjakdbmbjhwlx 2>/dev/null; then
    echo "  ✅ Successfully deleted $func"
  else
    echo "  ⚠️  Could not delete $func (may not exist or already deleted)"
  fi
  
  echo ""
done

echo "✨ Cleanup complete!"
echo ""
echo "📋 Remaining functions should be:"
echo "  - analyze-contract"
echo "  - classify-contract"
echo "  - admin-user-management"
echo "  - send-welcome-email-sendgrid"
echo "  - send-password-reset-sendgrid"
echo ""
echo "Run 'supabase functions list --project-ref cqvufndxjakdbmbjhwlx' to verify."
