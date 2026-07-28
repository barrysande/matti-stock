<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Row } from '@tanstack/table-core';
	import type { Schema } from './schemas.js';

	let { row }: { row: Row<Schema> } = $props();
</script>

<div class="w-32">
	<Badge variant="outline" class="px-1.5 text-muted-foreground">
		{row.original.type}
	</Badge>
</div>
