import { stubMatchMedia } from './a11y'

// svelte/motion reads matchMedia at import time, so jsdom tests need it before any component loads.
if (typeof window !== 'undefined') stubMatchMedia()
