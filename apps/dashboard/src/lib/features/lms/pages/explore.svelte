<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { profile } from '$lib/utils/store/user';
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { Search } from '@cio/ui/custom/search';
  import { SortSelect } from '$features/ui';
  import { Empty } from '@cio/ui/custom/empty';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import LibraryCourseCard from '../components/library-course-card.svelte';
  import { CourseSortBy, DEFAULT_COURSE_SORT, COURSE_SORT_OPTIONS } from '$features/course/utils/constants';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { LibraryApi } from '../api/library.svelte';
  import * as Pagination from '@cio/ui/base/pagination';
  import { Button } from '@cio/ui/base/button';

  const EXPLORE_LIMIT = 12;
  const libraryApi = new LibraryApi();
  let sortKey = $state<CourseSortBy>(DEFAULT_COURSE_SORT);
  let currentPage = $state(1);
  const search = new DebouncedSearch({
    onApply: () => {
      currentPage = 1;
    }
  });
  const pagination = $derived(libraryApi.pagination);
  const sortOptions = $derived(COURSE_SORT_OPTIONS.map((option) => ({ value: option.value, label: $t(option.label) })));

  $effect(() => {
    const organizationId = $currentOrg.id;
    const profileId = $profile.id;
    const searchValue = search.applied;
    const pageNumber = currentPage;
    const sort = sortKey;
    if (!profileId || !organizationId) return;

    untrack(() => void libraryApi.loadLibrary({ limit: EXPLORE_LIMIT, page: pageNumber, search: searchValue, sort }));
  });

  function changeSort(value: CourseSortBy) {
    sortKey = value;
    currentPage = 1;
  }

  onDestroy(() => {
    search.destroy();
    libraryApi.cancel();
  });
</script>

{#if libraryApi.loadFailed}
  <div role="alert" class="ui:bg-danger-soft ui:text-danger-foreground mb-4 rounded-xl p-4 text-sm">
    {$t('mp_workspace.load_error')}
  </div>
  <Button
    variant="outline"
    size="sm"
    onclick={() =>
      libraryApi.loadLibrary({ limit: EXPLORE_LIMIT, page: currentPage, search: search.applied, sort: sortKey })}
    >{$t('mp_workspace.retry')}</Button
  >
{/if}

<div class="mb-4 flex flex-wrap justify-end gap-3">
  <Search
    placeholder={$t('courses.search_placeholder')}
    bind:value={search.draft}
    onValueChange={(value) => search.input(value)}
  />
  <SortSelect options={sortOptions} bind:value={() => sortKey, changeSort} />
</div>
{#if !libraryApi.courses && !libraryApi.loadFailed}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {#each [0, 1, 2] as index (index)}<Skeleton class="h-64 rounded-xl" />{/each}
  </div>
{:else if libraryApi.courses?.length === 0 && !libraryApi.loadFailed}
  <Empty
    title={$t(search.applied ? 'mp_workspace.no_results' : 'explore.empty_heading')}
    description={$t(search.applied ? 'mp_workspace.adjust_search' : 'explore.empty_description')}
    variant="page"
  />
{:else if libraryApi.courses}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={libraryApi.isLibraryLoading}>
    {#each libraryApi.courses as course (course.id)}<LibraryCourseCard {course} />{/each}
  </div>
{/if}

{#if pagination && pagination.totalPages > 1}
  <Pagination.Root
    count={pagination.total}
    perPage={pagination.limit}
    page={currentPage}
    onPageChange={(pageNumber) => {
      currentPage = pageNumber;
    }}
    class="mt-6"
  >
    {#snippet children({ pages, currentPage: activePage })}
      <Pagination.Content>
        <Pagination.Item><Pagination.PrevButton /></Pagination.Item>
        {#each pages as pageItem (pageItem.key)}
          {#if pageItem.type === 'ellipsis'}<Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
          {:else}<Pagination.Item
              ><Pagination.Link page={pageItem} isActive={activePage === pageItem.value}
                >{pageItem.value}</Pagination.Link
              ></Pagination.Item
            >{/if}
        {/each}
        <Pagination.Item><Pagination.NextButton /></Pagination.Item>
      </Pagination.Content>
    {/snippet}
  </Pagination.Root>
{/if}
