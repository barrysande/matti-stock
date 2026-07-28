import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// The API exposes its generated Tuyau registry as raw TypeScript.
	// Bundle it during SSR so Node never has to load that source directly.
	ssr: {
		noExternal: ['api']
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Produce the standalone Node server used by the container runtime.
			adapter: adapter()
		})
	]
});
