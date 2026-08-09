<script>
	import FloatingLines from '$lib/components/FloatingLines.svelte';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
	import { auth, googleProvider } from '$lib/firebase';

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				goto('/home');
			}
		});

		return unsubscribe;
	});

	async function googleLogin() {
		try {
			await signInWithPopup(auth, googleProvider);
			goto('/home');
		} catch (err) {
			console.error(err);
		}
	}
</script>

<div class="page">
	<div class="background">
		<FloatingLines animationSpeed={1} />
	</div>

	<div class="mid">
		<h2 class="outlined-text text-center text-7xl font-black">quicktext</h2>

		<p class="text-center text-lg text-white">The forum for fast talking.</p>

		<button class="login" onclick={googleLogin}> Continue with Google </button>
	</div>
</div>
