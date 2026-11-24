<script lang="ts">
  import { regions } from './lib/announcer.svelte'
</script>

<!-- Mounted once, before anything is announced; never conditionally rendered. -->
<div class="sr-only" role="status">{regions.polite}</div>
<div class="sr-only" role="alert">{regions.alert}</div>
