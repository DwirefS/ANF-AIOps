#!/bin/bash
# Fix import issues in MCP server tool files

# Change to the tools directory
cd "$(dirname "$0")/src/tools"

# List of files that need import fixes
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

# Fix imports in each file
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing imports in $file..."
        
        # Replace the MCP SDK Tool import with local Tool import
        sed -i '' "s|import { Tool } from '@modelcontextprotocol/sdk/types.js';|import { Tool } from '../types/tool';|g" "$file"
        
        # Convert Zod schemas to JSON schemas in inputSchema
        # This is more complex and would need manual adjustment, but we can add a comment
        sed -i '' "s|inputSchema: z.object|inputSchema: /* TODO: Convert to JSON Schema */ z.object|g" "$file"
    fi
done

echo "Import fixes completed!"