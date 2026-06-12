<script setup>
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <footer class="border-t border-line py-5 text-center text-xs text-dim">
      <p>
        KUBADEX — a field guide for Pokémon FireRed · LeafGreen · Ruby · Sapphire · Emerald.
        Data from <a href="https://pokeapi.co" target="_blank" rel="noopener" class="text-muted underline decoration-line2 hover:text-ink">PokéAPI</a>.
        Pokémon © Nintendo / Creatures Inc. / GAME FREAK — fan project, not affiliated.
      </p>
    </footer>
  </div>
</template>

<style>
.page-enter-active, .page-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; }
</style>
