<script setup>
import { onMounted, ref } from 'vue'

const emit = defineEmits(['enter'])
const dialog = ref(null)
const drift = ref({ '--wave-x': '0px', '--wave-y': '0px' })
function follow(event) {
  const bounds = dialog.value.getBoundingClientRect()
  drift.value = {
    '--wave-x': `${((event.clientX - bounds.left) / bounds.width - 0.5) * 40}px`,
    '--wave-y': `${((event.clientY - bounds.top) / bounds.height - 0.5) * 28}px`,
  }
}
function reset() { drift.value = { '--wave-x': '0px', '--wave-y': '0px' } }
onMounted(() => dialog.value.showModal())
</script>

<template>
  <dialog ref="dialog" class="welcome-intro" aria-labelledby="welcome-title" :style="drift" @pointermove="follow" @pointerleave="reset" @cancel.prevent="emit('enter')">
    <div class="welcome-grain" aria-hidden="true"></div>
    <header class="welcome-top"><span class="welcome-maker">theminmaxers</span><span class="welcome-edition">VERHALEN VAN ZEELAND</span></header>
    <div class="welcome-copy">
      <p class="welcome-kicker"><span></span> ELKE PLEK HEEFT EEN VERHAAL</p>
      <h1 id="welcome-title">Zeeland<span>Vertelt.</span></h1>
      <p class="welcome-description">Waar het water het land ontmoet,<br />komen de verhalen tot leven.</p>
      <button class="welcome-enter" type="button" autofocus @click="emit('enter')">Ontdek Zeeland <span aria-hidden="true">↗</span></button>
    </div>
    <div class="welcome-sea" aria-hidden="true">
      <svg viewBox="0 0 1600 700" preserveAspectRatio="none">
        <defs><linearGradient id="welcome-water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#328d89" /><stop offset="1" stop-color="#123f43" /></linearGradient></defs>
        <g class="welcome-wave welcome-wave-back"><path d="M-800 300 Q-600 170-400 300T0 300T400 300T800 300T1200 300T1600 300T2000 300T2400 300V900H-800Z" fill="#8db9aa" /></g>
        <g class="welcome-wave welcome-wave-mid"><path d="M-800 350 Q-600 230-400 350T0 350T400 350T800 350T1200 350T1600 350T2000 350T2400 350V900H-800Z" fill="#529c93" /></g>
        <g class="welcome-wave welcome-wave-front"><path d="M-800 410 Q-600 310-400 410T0 410T400 410T800 410T1200 410T1600 410T2000 410T2400 410V900H-800Z" fill="url(#welcome-water)" /><path d="M-800 410 Q-600 310-400 410T0 410T400 410T800 410T1200 410T1600 410T2000 410T2400 410" fill="none" stroke="#d9efe0" stroke-opacity=".45" stroke-width="2" /></g>
      </svg>
    </div>
    <footer class="welcome-foot"><span>BRUGGEN · WATERKERINGEN · MUSEA</span><span>Laat je meevoeren <span aria-hidden="true">↓</span></span></footer>
  </dialog>
</template>

<style scoped>
.welcome-intro { position: fixed; inset: 0; width: 100%; max-width: none; height: 100%; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0; overflow: hidden; color: var(--theme-ink); background: var(--theme-paper); }
.welcome-intro::backdrop { background: var(--theme-paper); }
.welcome-grain { position: absolute; inset: 0; pointer-events: none; opacity: .3; background-image: radial-gradient(#56776b35 .6px, transparent .6px); background-size: 5px 5px; }
.welcome-top { position: absolute; z-index: 2; top: max(1.5rem, env(safe-area-inset-top)); left: max(6vw, env(safe-area-inset-left)); right: max(6vw, env(safe-area-inset-right)); display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.welcome-maker { font-size: .85rem; font-weight: 750; letter-spacing: -.04em; }
.welcome-edition { font-size: .6rem; letter-spacing: .18em; }
.welcome-copy { position: absolute; z-index: 2; top: 21%; left: 8%; right: 8%; text-align: center; }
.welcome-kicker { display: flex; align-items: center; justify-content: center; gap: .6rem; font-size: .62rem; letter-spacing: .2em; }
.welcome-kicker > span { width: 6px; height: 6px; border-radius: 50%; background: #b46a43; }
h1 { margin: 1.5rem 0 1rem; font: clamp(3.2rem, 9vw, 8rem)/.98 Georgia, serif; letter-spacing: -.065em; }
h1 > span { color: var(--theme-rust); }
.welcome-description { font-size: clamp(.9rem, 1.6vw, 1.15rem); line-height: 1.8; color: var(--theme-muted); }
.welcome-enter { display: inline-flex; align-items: center; justify-content: space-between; gap: 2.5rem; margin-top: 1.8rem; padding: .9rem 1.3rem; border: 1px solid var(--theme-ink); border-radius: 999px; background: var(--theme-ink); color: #fffdf2; font: inherit; font-size: .85rem; cursor: pointer; box-shadow: 0 6px 20px #173f3e18; transition: background .2s, transform .2s; }
.welcome-enter:hover { background: #27605b; transform: translateY(-2px); }
.welcome-enter > span { font-size: 1.2rem; }
.welcome-enter:focus-visible { outline: 3px solid var(--theme-rust); outline-offset: 5px; }
.welcome-sea { position: absolute; inset: 39% -6% -5%; transform: translate(var(--wave-x), var(--wave-y)); transition: transform .7s ease-out; pointer-events: none; }
.welcome-sea svg { width: 100%; height: 100%; overflow: visible; }
.welcome-wave { animation: welcome-flow 13s linear infinite; }
.welcome-wave-back { opacity: .65; animation-duration: 21s; animation-direction: reverse; }
.welcome-wave-mid { opacity: .8; animation-duration: 17s; }
.welcome-foot { position: absolute; z-index: 2; bottom: max(1.5rem, env(safe-area-inset-bottom)); left: 6vw; right: 6vw; display: flex; justify-content: space-between; align-items: center; gap: 1rem; color: #e0ede3; font-size: .6rem; letter-spacing: .14em; }
.welcome-foot > span:last-child { letter-spacing: .02em; font-size: .75rem; }
@keyframes welcome-flow { from { transform: translateX(0); } to { transform: translateX(-800px); } }
@media (max-width: 600px) { .welcome-copy { top: 24%; left: 5%; right: 5%; } h1 { font-size: clamp(2.8rem, 11vw, 4.5rem); margin-top: 1.3rem; } .welcome-edition { font-size: .5rem; letter-spacing: .1em; } .welcome-kicker { font-size: .5rem; letter-spacing: .13em; } .welcome-sea { top: 44%; } .welcome-foot { flex-direction: column; align-items: flex-start; gap: .6rem; } }
@media (max-height: 550px) { .welcome-copy { top: 17%; } h1 { font-size: 3.2rem; margin: .7rem 0; } .welcome-description { font-size: .8rem; line-height: 1.4; } .welcome-enter { margin-top: .8rem; padding: .6rem 1rem; } .welcome-sea { top: 30%; } }
@media (prefers-reduced-motion: reduce) { .welcome-wave { animation: none; } .welcome-sea { transform: none; transition: none; } .welcome-enter { transition: none; } }
</style>
