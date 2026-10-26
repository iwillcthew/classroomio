<script lang="ts">
  import * as Select from '@cio/ui/base/select';
  import * as Field from '@cio/ui/base/field';
  import { t } from '$lib/utils/functions/translations';

  let {
    label,
    value = $bindable(''),
    options,
    onchange,
    onSelect,
    disabled = false
  }: {
    label: string;
    value?: string;
    options: { value: string; label: string }[];
    onchange?: () => void;
    onSelect?: (value: string) => void;
    disabled?: boolean;
  } = $props();
  const id = $props.id();
  const selected = $derived(options.find((option) => option.value === value)?.label ?? $t('workforce.not_specified'));
</script>

<Field.Field>
  <Field.Label for={id}>{label}</Field.Label>
  <Select.Root
    type="single"
    value={value || '__none'}
    {disabled}
    onValueChange={(next) => {
      value = next === '__none' ? '' : next;
      onSelect?.(value);
      onchange?.();
    }}
  >
    <Select.Trigger {id} class="w-full max-w-none">{selected}</Select.Trigger>
    <Select.Content>
      <Select.Item value="__none" label={$t('workforce.not_specified')}>{$t('workforce.not_specified')}</Select.Item>
      {#each options as option (option.value)}
        <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</Field.Field>
