#!/bin/bash
# compress-workspace.sh — Compress workspace ke tar.gz, split jika > 40MB
# Usage: bash compress-workspace.sh [output_name]
# Output: /home/z/my-project/upload/{output_name}.tar.gz atau .tar.gz.001/.002/.003
#
# Compress dengan gzip (jauh lebih kecil dari tar biasa).
# Exclude: node_modules, .next, .git, upload, skills, backups, dll.

set -e

PROJECT_DIR="/home/z/my-project"
UPLOAD_DIR="$PROJECT_DIR/upload"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_NAME="${1:-workspace-${TIMESTAMP}}"
OUTPUT_FILE="$UPLOAD_DIR/${OUTPUT_NAME}.tar.gz"

mkdir -p "$UPLOAD_DIR"

echo "📦 Compressing workspace to $OUTPUT_FILE..."
echo "   Excluding: node_modules, .next, .git, upload, skills, backups, etc."

cd "$PROJECT_DIR"

# Create tar.gz with gzip compression (level 9 = max compression)
# Exclude large/unnecessary directories and files
tar -czf "$OUTPUT_FILE" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='upload' \
  --exclude='skills' \
  --exclude='seed-images' \
  --exclude='tool-results' \
  --exclude='backups' \
  --exclude='agent-ctx' \
  --exclude='.daemon.pid' \
  --exclude='.daemon.log' \
  --exclude='dev.log' \
  --exclude='*.tar' \
  --exclude='*.tar.*' \
  --exclude='*.tar.gz' \
  --exclude='*.xlsx' \
  --exclude='*.log' \
  --exclude='.bun' \
  --exclude='mini-services/*/node_modules' \
  --exclude='mini-services/*/bun.lock' \
  --exclude='public/machine-images' \
  --exclude='chat-service.log' \
  --exclude='compress-workspace.sh' \
  . 2>/dev/null

FILESIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE" 2>/dev/null)
FILESIZE_MB=$((FILESIZE / 1024 / 1024))

echo "✅ Tar.gz created: $OUTPUT_FILE ($FILESIZE_MB MB)"

# If file > 40MB, split into 40MB parts
MAX_SIZE=$((40 * 1024 * 1024))  # 40MB

if [ "$FILESIZE" -gt "$MAX_SIZE" ]; then
  echo "📦 File > 40MB, splitting into parts..."
  
  # Split the tar.gz file
  split -b 40m -d -a 3 "$OUTPUT_FILE" "${OUTPUT_FILE}."
  
  # Remove the original unsplit file
  rm "$OUTPUT_FILE"
  
  # List the parts
  echo "✅ Split complete:"
  ls -lh "${OUTPUT_FILE}."* | while read line; do
    echo "   $line"
  done
  
  PART_COUNT=$(ls "${OUTPUT_FILE}."* | wc -l)
  echo ""
  echo "📦 Created $PART_COUNT parts:"
  for f in "${OUTPUT_FILE}."*; do
    echo "   $(basename "$f")"
  done
  
  echo ""
  echo "💡 To restore: cat ${OUTPUT_NAME}.tar.gz.001 ${OUTPUT_NAME}.tar.gz.002 ... > ${OUTPUT_NAME}.tar.gz"
  echo "   Then: tar -xzf ${OUTPUT_NAME}.tar.gz"
else
  echo "✅ File < 40MB, no split needed."
  echo "📦 Output: $OUTPUT_FILE"
fi

echo ""
echo "📊 Final output:"
ls -lh "$UPLOAD_DIR"/${OUTPUT_NAME}* 2>/dev/null
