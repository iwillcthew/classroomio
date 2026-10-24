<script>
  import { page } from '$app/state';
  import { Button } from '@cio/ui/base/button';
  import SearchXIcon from '@lucide/svelte/icons/search-x';
  import { Empty } from '@cio/ui/custom/empty';
  import { t } from '$lib/utils/functions/translations';

  let query = $derived(new URLSearchParams(page.url.search));
  let isOrg = $derived(query.get('type') === 'org');

  function handleClick() {
    window.location.href = '/';
  }
</script>

<Empty
  title={isOrg ? $t('common.not_found.org_title') : $t('common.not_found.title')}
  description={$t('common.not_found.description')}
  icon={SearchXIcon}
  variant="page"
  layout="full-page"
  showLogo={true}
>
  <Button onclick={handleClick}>{$t('common.not_found.home')}</Button>
</Empty>
