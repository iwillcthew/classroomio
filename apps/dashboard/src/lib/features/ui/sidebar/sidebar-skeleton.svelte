<div data-tone="ink" class="ui:bg-sidebar hidden h-svh w-64 shrink-0 flex-col gap-2 p-3 md:flex">
  <div class="flex items-center gap-3 p-1.5">
    <div class="size-9 rounded-lg bg-white/90"></div>
    <div class="flex flex-1 flex-col gap-1.5">
      <div class="h-3.5 w-24 animate-pulse rounded bg-white/15"></div>
      <div class="h-2.5 w-16 animate-pulse rounded bg-white/10"></div>
    </div>
  </div>

  <div class="mt-4 flex flex-col gap-1">
    {#each Array(7) as _, index (index)}
      <div class="flex items-center gap-3 rounded-md px-2.5 py-2">
        <div class="size-4 animate-pulse rounded bg-white/10"></div>
        <div class="h-3 flex-1 animate-pulse rounded bg-white/10"></div>
      </div>
    {/each}
  </div>

  <div class="flex-1"></div>

  <div class="flex items-center gap-3 p-2">
    <div class="size-8 animate-pulse rounded-full bg-white/15"></div>
    <div class="flex flex-1 flex-col gap-1.5">
      <div class="h-3 w-24 animate-pulse rounded bg-white/15"></div>
      <div class="h-2.5 w-16 animate-pulse rounded bg-white/10"></div>
    </div>
  </div>
</div>
