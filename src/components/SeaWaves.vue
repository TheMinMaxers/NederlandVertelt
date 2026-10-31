<template>
  <div class="sea-waves" aria-hidden="true">
    <svg viewBox="0 0 1600 160" preserveAspectRatio="none">
      <path class="sea-wave-back" d="M-800 65Q-600 0-400 65T0 65T400 65T800 65T1200 65T1600 65T2000 65T2400 65V200H-800Z" />
      <path class="sea-wave-front" d="M-800 105Q-600 50-400 105T0 105T400 105T800 105T1200 105T1600 105T2000 105T2400 105V200H-800Z" />
    </svg>
  </div>
</template>

<style scoped>
.sea-waves { position: absolute; inset: auto 0 0; height: 65px; overflow: hidden; pointer-events: none; }
svg { display: block; width: 100%; height: 100%; }
path { animation: sea-drift 24s linear infinite; }
.sea-wave-back { fill: #8db9aa; opacity: .3; animation-direction: reverse; animation-duration: 32s; }
.sea-wave-front { fill: var(--theme-water); opacity: .22; }
@keyframes sea-drift { from { transform: translateX(0); } to { transform: translateX(-800px); } }
@media (prefers-reduced-motion: reduce) { path { animation: none; } }
</style>
