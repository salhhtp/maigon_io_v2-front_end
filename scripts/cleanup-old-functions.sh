#!/bin/bash

# =============================================================================
# Cleanup Script for Old Supabase Edge Functions
# =============================================================================
# This script removes functions that are deployed but no longer exist in the codebase.
# These are legacy functions that have been replaced or removed.
#
# Usage:
#   bash scripts/cleanup-old-functions.sh
#
# What this script does:
#   1. Lists all old functions to be deleted
#   2. Asks for confirmation
#   3. Deletes each old function from your Supabase project
#   4. Shows final status
# =============================================================================

echo ""
echo "═══════════════════════════��════════════════════════════════════"
echo "   🧹 Supabase Edge Functions Cleanup"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project reference
PROJECT_REF="cqvufndxjakdbmbjhwlx"

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

# Functions that should remain
KEEP_FUNCTIONS=(
  "analyze-contract"
  "classify-contract"
  "admin-user-management"
  "send-welcome-email-sendgrid"
  "send-password-reset-sendgrid"
)

echo "${YELLOW}⚠️  The following OLD functions will be DELETED:${NC}"
echo ""
for func in "${OLD_FUNCTIONS[@]}"; do
  echo "  ${RED}❌ $func${NC} (no longer in codebase)"
done

echo ""
echo "${GREEN}✅ The following functions will be KEPT:${NC}"
echo ""
for func in "${KEEP_FUNCTIONS[@]}"; do
  echo "  ${GREEN}✓ $func${NC}"
done

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""
read -p "Do you want to proceed with deletion? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "${YELLOW}❌ Cleanup cancelled.${NC}"
  echo ""
  exit 0
fi

echo "Starting deletion process..."
echo ""

# Counter for tracking
DELETED=0
FAILED=0
NOT_FOUND=0

# Delete each function
for func in "${OLD_FUNCTIONS[@]}"; do
  echo "────────────────────────────────────────────────────────────────"
  echo "🗑️  Deleting function: ${BLUE}$func${NC}"
  
  # Try to delete the function
  OUTPUT=$(supabase functions delete "$func" --project-ref "$PROJECT_REF" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "  ${GREEN}✅ Successfully deleted $func${NC}"
    ((DELETED++))
  else
    # Check if error is because function doesn't exist
    if [[ $OUTPUT == *"not found"* ]] || [[ $OUTPUT == *"does not exist"* ]]; then
      echo "  ${YELLOW}⚠️  Function $func not found (may be already deleted)${NC}"
      ((NOT_FOUND++))
    else
      echo "  ${RED}❌ Failed to delete $func${NC}"
      echo "  ${RED}Error: $OUTPUT${NC}"
      ((FAILED++))
    fi
  fi
  
  echo ""
done

echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✨ Cleanup Summary:"
echo ""
echo "  ${GREEN}✅ Deleted: $DELETED${NC}"
echo "  ${YELLOW}⚠️  Not Found: $NOT_FOUND${NC}"
echo "  ${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "${RED}⚠️  Some functions could not be deleted. Please check the errors above.${NC}"
  echo ""
fi

echo "────────────────────────────────────────────────────────────────"
echo ""
echo "📋 Verifying remaining functions..."
echo ""
echo "Running: ${BLUE}supabase functions list --project-ref $PROJECT_REF${NC}"
echo ""

# List remaining functions
supabase functions list --project-ref "$PROJECT_REF"

echo ""
echo "═════════════════���══════════════════════════════════════════════"
echo "   ✅ Cleanup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Expected functions (5 total):"
for func in "${KEEP_FUNCTIONS[@]}"; do
  echo "  ✓ $func"
done
echo ""
echo "If the list above doesn't match, please review manually at:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo ""
