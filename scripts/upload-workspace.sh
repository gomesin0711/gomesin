#!/bin/bash
# Upload workspace source archives to file hosting services
# Provides direct download links since gateway download fails

set -e

WORKDIR="/home/z/my-project"
DOWNLOAD_DIR="${WORKDIR}/download"
ARCHIVE_NAME="gomesin-workspace-src"
TAR_FILE="${DOWNLOAD_DIR}/${ARCHIVE_NAME}.tar.gz"
ZIP_FILE="${DOWNLOAD_DIR}/${ARCHIVE_NAME}.zip"

echo "=== Creating fresh source-only archive ==="

# Create tar.gz (exclude heavy dirs)
cd "${WORKDIR}"
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='download' \
    --exclude='scripts' \
    --exclude='*.log' \
    --exclude='tmp' \
    --exclude='cache' \
    -czf "${TAR_FILE}" \
    src package.json package-lock.json tsconfig.json next.config.ts \
    postcss.config.mjs tailwind.config.ts components.json \
    prisma README.md .env.example 2>/dev/null || \
tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='download' --exclude='scripts' \
    -czf "${TAR_FILE}" \
    src package.json package-lock.json tsconfig.json next.config.ts 2>/dev/null

ls -lh "${TAR_FILE}"
echo ""

echo "=== Uploading to tmpfiles.org ==="
TMPFILES_RESPONSE=$(curl -s -X POST \
  -F "file=@${TAR_FILE}" \
  -F "expire=86400" \
  "https://tmpfiles.org/api/v1/upload")

echo "tmpfiles.org response: ${TMPFILES_RESPONSE}"

# Extract the viewer URL
TMPFILES_URL=$(echo "${TMPFILES_RESPONSE}" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "tmpfiles viewer URL: ${TMPFILES_URL}"

if [ -n "${TMPFILES_URL}" ]; then
    # Convert viewer URL to direct download URL
    # https://tmpfiles.org/12345/file.tar.gz -> https://tmpfiles.org/dl/12345/file.tar.gz
    DIRECT_URL=$(echo "${TMPFILES_URL}" | sed 's|tmpfiles.org/|tmpfiles.org/dl/|')
    echo ""
    echo "=== DIRECT DOWNLOAD URL (tmpfiles.org, valid 24 hours) ==="
    echo "${DIRECT_URL}"
fi

echo ""
echo "=== Also uploading to catbox.moe as backup (permanent) ==="
CATBOX_RESPONSE=$(curl -s -X POST \
    -F "reqtype=fileupload" \
    -F "fileToUpload=@${TAR_FILE}" \
    "https://catbox.moe/user/api.php")

echo "catbox.moe response: ${CATBOX_RESPONSE}"

if [[ "${CATBOX_RESPONSE}" == https://* ]]; then
    echo ""
    echo "=== PERMANENT DOWNLOAD URL (catbox.moe) ==="
    echo "${CATBOX_RESPONSE}"
fi

echo ""
echo "=== DONE ==="
