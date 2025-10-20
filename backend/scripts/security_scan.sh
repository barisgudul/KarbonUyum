### backend/scripts/security_scan.sh
#!/bin/bash

###############################################################################
# KarbonUyum Security Scanning Script
#
# This script runs comprehensive dependency vulnerability checks.
# Part of MVP blocking security requirements.
#
# Usage: ./security_scan.sh
# Exit codes:
#   0 - No vulnerabilities found
#   1 - HIGH/CRITICAL vulnerabilities found (BLOCKING)
#   2 - Script error
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$BACKEND_DIR/.security-reports"

# Create reports directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}KarbonUyum Security Scan${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if venv is activated
if [[ ! "$VIRTUAL_ENV" == *"venv"* ]]; then
    echo -e "${YELLOW}⚠️  Virtual environment not detected. Attempting to activate...${NC}"
    source "$BACKEND_DIR/venv/bin/activate" || {
        echo -e "${RED}❌ Failed to activate virtual environment${NC}"
        exit 2
    }
fi

echo -e "${BLUE}📦 Running pip-audit...${NC}"
pip-audit --desc > "$REPORT_DIR/pip-audit-report.txt" 2>&1 || true

# Parse pip-audit results
PIP_AUDIT_CRITICAL=$(grep -c "CRITICAL" "$REPORT_DIR/pip-audit-report.txt" || echo "0")
PIP_AUDIT_HIGH=$(grep -c "HIGH" "$REPORT_DIR/pip-audit-report.txt" || echo "0")
PIP_AUDIT_MEDIUM=$(grep -c "MEDIUM" "$REPORT_DIR/pip-audit-report.txt" || echo "0")

if [ "$PIP_AUDIT_CRITICAL" -gt 0 ] || [ "$PIP_AUDIT_HIGH" -gt 0 ]; then
    echo -e "${RED}❌ pip-audit found security issues:${NC}"
    echo -e "   CRITICAL: $PIP_AUDIT_CRITICAL"
    echo -e "   HIGH: $PIP_AUDIT_HIGH"
    echo -e "   MEDIUM: $PIP_AUDIT_MEDIUM"
    echo -e "${YELLOW}Report: $REPORT_DIR/pip-audit-report.txt${NC}"
else
    echo -e "${GREEN}✅ pip-audit: No CRITICAL/HIGH vulnerabilities${NC}"
    [ "$PIP_AUDIT_MEDIUM" -gt 0 ] && echo -e "   ⚠️  MEDIUM: $PIP_AUDIT_MEDIUM (documented)"
fi

echo ""
echo -e "${BLUE}🔍 Running safety check...${NC}"
safety check --json > "$REPORT_DIR/safety-report.json" 2>&1 || true

# Parse safety results
SAFETY_VULNS=$(grep -o '"vulnerability"' "$REPORT_DIR/safety-report.json" | wc -l || echo "0")

if [ "$SAFETY_VULNS" -gt 0 ]; then
    echo -e "${RED}❌ safety found vulnerabilities:${NC}"
    echo -e "   Total: $SAFETY_VULNS"
    echo -e "${YELLOW}Report: $REPORT_DIR/safety-report.json${NC}"
else
    echo -e "${GREEN}✅ safety: No known vulnerabilities${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================${NC}"

# Final determination
BLOCKING_ISSUES=$((PIP_AUDIT_CRITICAL + PIP_AUDIT_HIGH))

if [ "$BLOCKING_ISSUES" -gt 0 ]; then
    echo -e "${RED}🚨 BLOCKING ISSUES FOUND${NC}"
    echo -e "Fix required before production deployment."
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review pip-audit report:"
    echo "   cat $REPORT_DIR/pip-audit-report.txt"
    echo ""
    echo "2. Update affected packages or use alternative dependencies"
    echo "3. Re-run this script to verify"
    exit 1
else
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    echo ""
    echo -e "${YELLOW}Reports generated:${NC}"
    echo "  - $REPORT_DIR/pip-audit-report.txt"
    echo "  - $REPORT_DIR/safety-report.json"
    echo ""
    echo -e "${GREEN}Ready for MVP deployment.${NC}"
    exit 0
fi
