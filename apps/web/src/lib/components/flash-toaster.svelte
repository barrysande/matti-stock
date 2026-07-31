<script lang="ts">
	import { page } from '$app/state';
	import { getFlash } from 'sveltekit-flash-message';
	import { toast } from 'svelte-sonner';

	const flash = getFlash(page);

	$effect(() => {
		const message = $flash;
		if (!message) return;

		if (message.type === 'success') toast.success(message.message);
		else if (message.type === 'error') toast.error(message.message);
		else if (message.type === 'warning') toast.warning(message.message);
		else toast.info(message.message);

		$flash = undefined;
	});
</script>
