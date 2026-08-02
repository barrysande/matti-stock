<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>MaTTI Stock</title>
	<meta
		name="description"
		content="Stock control for receiving, counting, issuing, and auditing inventory."
	/>
</svelte:head>

<section class="flex flex-1 items-center justify-center py-8 md:py-12">
	<div class="w-full max-w-lg rounded-3xl bg-card p-6 text-card-foreground shadow-sm md:p-8">
		<p class="font-heading text-sm font-semibold tracking-[0.18em] text-primary uppercase">
			MaTTI Stock
		</p>
		<h1 class="mt-3 font-heading text-3xl font-semibold tracking-tight">Access established</h1>
		<p class="mt-3 text-sm leading-6 text-muted-foreground">
			You are signed in as {data.account.person.displayName}.
		</p>

		<div class="mt-6 flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
			<span
				class={['size-2.5 rounded-full', data.apiAvailable ? 'bg-primary' : 'bg-destructive']}
				aria-hidden="true"
			></span>
			<div>
				<p class="text-sm font-medium">{data.apiAvailable ? 'API connected' : 'API unavailable'}</p>
				<p class="text-xs text-muted-foreground">Checked through the public liveness probe</p>
			</div>
		</div>
	</div>
</section>
