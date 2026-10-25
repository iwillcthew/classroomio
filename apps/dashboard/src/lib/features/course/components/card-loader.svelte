<script lang="ts">
  import { Skeleton } from '@cio/ui/base/skeleton';
</script>

<div class="ui:bg-card ui:shadow-card flex w-full flex-col overflow-hidden rounded-xl border">
  <Skeleton class="aspect-video w-full rounded-none" />
  <div class="flex flex-col gap-3 p-4">
    <Skeleton class="h-4 w-3/4" />
    <Skeleton class="h-3 w-full" />
    <Skeleton class="h-3 w-2/3" />
    <div class="mt-3 flex justify-between">
      <Skeleton class="h-3 w-1/3" />
      <Skeleton class="h-3 w-1/5" />
    </div>
  </div>
</div>
