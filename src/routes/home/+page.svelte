<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import {
		collection,
		query,
		orderBy,
		onSnapshot,
		addDoc,
		updateDoc,
		deleteDoc,
		doc,
		serverTimestamp
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase';

	let user = $state(null);
	let topics = $state([]);
	let replies = $state([]);
	let topicTitle = $state('');
	let replyInputs = $state({});

	// Edit state for replies
	let editingReplyId = $state(null);
	let editText = $state('');

	onMount(() => {
		const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
			if (!currentUser) {
				goto('/');
			} else {
				user = currentUser;
			}
		});

		// Real-time listener for topics
		const qTopics = query(collection(db, 'topics'), orderBy('createdAt', 'desc'));
		const unsubscribeTopics = onSnapshot(qTopics, (snapshot) => {
			topics = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		});

		// Real-time listener for replies
		const qReplies = query(collection(db, 'replies'), orderBy('createdAt', 'asc'));
		const unsubscribeReplies = onSnapshot(qReplies, (snapshot) => {
			replies = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		});

		return () => {
			unsubscribeAuth();
			unsubscribeTopics();
			unsubscribeReplies();
		};
	});

	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/');
		} catch (error) {
			console.error('Error signing out: ', error);
		}
	}

	async function createTopic() {
		if (!topicTitle.trim() || !user) return;

		try {
			await addDoc(collection(db, 'topics'), {
				title: topicTitle.trim(),
				authorId: user.uid,
				authorName: user.displayName || 'Anonymous',
				authorPhoto: user.photoURL || '',
				createdAt: serverTimestamp()
			});
			topicTitle = '';
		} catch (error) {
			console.error('Error adding topic: ', error);
		}
	}

	async function deleteTopic(topicId) {
		const topicReplies = replies.filter((r) => r.topicId === topicId);
		if (topicReplies.length >= 10) {
			alert('Cannot delete topic with 10 or more replies.');
			return;
		}

		try {
			const deleteRepliesPromises = topicReplies.map((reply) =>
				deleteDoc(doc(db, 'replies', reply.id))
			);
			await Promise.all(deleteRepliesPromises);
			await deleteDoc(doc(db, 'topics', topicId));
		} catch (error) {
			console.error('Error deleting topic: ', error);
		}
	}

	async function createReply(topicId) {
		const text = replyInputs[topicId]?.trim();
		if (!text || !user) return;

		try {
			await addDoc(collection(db, 'replies'), {
				topicId: topicId,
				text: text,
				authorId: user.uid,
				authorName: user.displayName || 'Anonymous',
				createdAt: serverTimestamp()
			});
			replyInputs[topicId] = '';
		} catch (error) {
			console.error('Error adding reply: ', error);
		}
	}

	function startEditReply(reply) {
		editingReplyId = reply.id;
		editText = reply.text;
	}

	function cancelEditReply() {
		editingReplyId = null;
		editText = '';
	}

	async function saveEditReply(replyId) {
		if (!editText.trim()) return;

		try {
			await updateDoc(doc(db, 'replies', replyId), {
				text: editText.trim()
			});
			editingReplyId = null;
			editText = '';
		} catch (error) {
			console.error('Error updating reply: ', error);
		}
	}

	async function deleteReply(replyId) {
		try {
			await deleteDoc(doc(db, 'replies', replyId));
			if (editingReplyId === replyId) {
				cancelEditReply();
			}
		} catch (error) {
			console.error('Error deleting reply: ', error);
		}
	}
</script>

<div class="min-h-screen min-w-screen bg-[#f3f2f1]">
	<div class="mx-auto min-h-screen max-w-2xl p-6 font-sans">
		<!-- Header with Welcome & Logout Button -->
		<div class="mb-6 flex items-center justify-between">
			<p class="text-xl font-bold text-gray-800">Welcome to quicktext, {user?.displayName}!</p>
			<button
				onclick={handleLogout}
				class="rounded-lg border-2 border-red-400 bg-red-300 px-3 py-1.5 text-sm font-medium text-gray-900 transition hover:bg-red-500"
			>
				Logout
			</button>
		</div>

		<!-- Create Topic Section -->
		<div class="mb-6 flex gap-2">
			<input
				type="text"
				bind:value={topicTitle}
				placeholder="New Topic..."
				class="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			/>
			<button
				onclick={createTopic}
				class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
			>
				Create Topic
			</button>
		</div>

		<hr class="mb-6 border-gray-200" />

		<!-- Topics List with Reddit-style Reply Threads -->
		{#each topics as topic (topic.id)}
			{@const topicReplies = replies.filter((r) => r.topicId === topic.id)}
			<article class="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<h2 class="text-lg font-semibold text-gray-900">{topic.title}</h2>
						<p class="mt-1 text-xs text-gray-500">Posted by {topic.authorName}</p>
					</div>

					{#if user && user.uid === topic.authorId && topicReplies.length < 10}
						<button
							onclick={() => deleteTopic(topic.id)}
							class="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-800"
						>
							Delete Topic
						</button>
					{/if}
				</div>

				<!-- Replies Section -->
				<div class="mt-4 ml-6 border-l-2 border-gray-100 pl-4">
					<h4 class="mb-3 text-sm font-semibold text-gray-700">Comments ({topicReplies.length})</h4>

					{#each topicReplies as reply (reply.id)}
						<div class="mb-3 rounded-lg bg-gray-50 p-3">
							{#if editingReplyId === reply.id}
								<!-- Edit Mode -->
								<div class="flex flex-col gap-2">
									<textarea
										bind:value={editText}
										class="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
										rows="2"></textarea>
									<div class="flex gap-2">
										<button
											onclick={() => saveEditReply(reply.id)}
											class="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700"
										>
											Save
										</button>
										<button
											onclick={cancelEditReply}
											class="rounded bg-gray-400 px-3 py-1 text-xs font-medium text-white transition hover:bg-gray-500"
										>
											Cancel
										</button>
									</div>
								</div>
							{:else}
								<!-- View Mode -->
								<p class="text-sm whitespace-pre-wrap text-gray-800">{reply.text}</p>
								<div class="mt-2 flex items-center justify-between">
									<span class="text-xs text-gray-500">by {reply.authorName}</span>

									{#if user && user.uid === reply.authorId}
										<div class="flex gap-2 text-xs">
											<button
												onclick={() => startEditReply(reply)}
												class="font-medium text-blue-600 hover:underline"
											>
												Edit
											</button>
											<button
												onclick={() => deleteReply(reply.id)}
												class="font-medium text-red-600 hover:underline"
											>
												Delete
											</button>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else}
						<p class="mb-3 text-sm text-gray-400 italic">No comments yet. Be the first!</p>
					{/each}

					<!-- Reply Input Box -->
					<div class="mt-3 flex gap-2">
						<input
							type="text"
							bind:value={replyInputs[topic.id]}
							placeholder="Write a reply..."
							class="flex-grow rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
						/>
						<button
							onclick={() => createReply(topic.id)}
							class="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-900"
						>
							Reply
						</button>
					</div>
				</div>
			</article>
		{/each}
	</div>
</div>
