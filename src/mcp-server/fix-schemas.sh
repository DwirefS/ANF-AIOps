#!/bin/bash
# Fix schema issues in MCP server tool files

cd "$(dirname "$0")/src/tools"

# Add import for the converter at the top of each file
FILES=(
    "accounts-operations.ts"
    "advanced-anf-operations.ts"
    "backup-operations.ts"
    "backup-policies-operations.ts"
    "backup-vaults-operations.ts"
    "backups-operations.ts"
    "backups-under-account.ts"
    "backups-under-backup-vault.ts"
    "backups-under-volume.ts"
    "comprehensive-anf-api.ts"
    "netapp-resource-quota-limits.ts"
    "netapp-resource-region-infos.ts"
    "netapp-resource-usages.ts"
    "netapp-resource.ts"
    "operations.ts"
    "pools-operations.ts"
    "security-compliance.ts"
    "snapshot-policies-operations.ts"
    "snapshots-operations.ts"
    "subvolumes-operations.ts"
    "volume-groups-operations.ts"
    "volume-quota-rules-operations.ts"
    "volumes-enhanced.ts"
    "volumes-operations.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing schemas in $file..."
        
        # Add the import for wrapZodSchema if not already present
        if ! grep -q "wrapZodSchema" "$file"; then
            # Add import after the zod import
            sed -i '' "/import { z } from 'zod';/a\\
import { wrapZodSchema } from '../utils/zod-to-json-schema';
" "$file"
        fi
        
        # Replace inputSchema: <SchemaName> with inputSchema: wrapZodSchema(<SchemaName>)
        # This handles various schema patterns
        sed -i '' 's/inputSchema: \([A-Za-z0-9_]*Schema\),/inputSchema: wrapZodSchema(\1),/g' "$file"
        sed -i '' 's/inputSchema: \([A-Za-z0-9_]*Schema\)$/inputSchema: wrapZodSchema(\1)/g' "$file"
    fi
done

echo "Schema fixes completed!"