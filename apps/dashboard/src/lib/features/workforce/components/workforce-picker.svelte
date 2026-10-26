<script lang="ts">
  import { CheckboxField } from '@cio/ui/custom/checkbox-field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  let {
    label,
    selected = $bindable<string[]>([]),
    options,
    ordered = false
  }: {
    label: string;
    selected?: string[];
    options: { value: string; label: string }[];
    ordered?: boolean;
  } = $props();
  let search = $state('');
  const visible = $derived(options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())));
  function toggle(value: string) {
    selected = selected.includes(value) ? selected.filter((id) => id !== value) : [...selected, value];
  }
  function move(index: number, offset: number) {
    const reordered = [...selected];
    const target = index + offset;
    if (target < 0 || target >= reordered.length) return;

    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    selected = reordered;
  }
</script>

<div class="space-y-2 rounded-lg border p-3">
  <InputField {label} bind:value={search} placeholder={$t('workforce.search')} />
  <div class="max-h-48 overflow-auto">
    {#each visible as option (option.value)}
      <CheckboxField
        label={option.label}
        checked={selected.includes(option.value)}
        onclick={() => toggle(option.value)}
      />
    {/each}
    {#if !visible.length}<p class="ui:text-muted-foreground text-sm">{$t('workforce.empty')}</p>{/if}
  </div>
  {#if ordered && selected.length}
    <ol class="space-y-2 border-t pt-2">
      {#each selected as value, index (value)}
        <li class="flex items-center gap-2 text-sm">
          <span class="flex-1">{index + 1}. {options.find((option) => option.value === value)?.label}</span>
          <Button size="sm" variant="secondary" disabled={index === 0} onclick={() => move(index, -1)}
            >{$t('workforce.move_up')}</Button
          >
          <Button size="sm" variant="secondary" disabled={index === selected.length - 1} onclick={() => move(index, 1)}
            >{$t('workforce.move_down')}</Button
          >
        </li>
      {/each}
    </ol>
  {/if}
</div>
