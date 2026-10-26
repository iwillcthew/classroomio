<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { profile } from '$lib/utils/store/user';
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { CoursesPage } from '$features/course/pages';
  import type { RecommendedCourses } from '$features/course/types';
  import { CourseSortBy, DEFAULT_COURSE_SORT } from '$features/course/utils/constants';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { LibraryApi } from '../api/library.svelte';
  import CoursePreviewModal from '$features/lms/components/course-preview-modal.svelte';
  import * as Pagination from '@cio/ui/base/pagination';
  import { Button } from '@cio/ui/base/button';

  const EXPLORE_LIMIT = 12;
  const libraryApi = new LibraryApi();
  let sortKey = $state<CourseSortBy>(DEFAULT_COURSE_SORT);
  let selectedCourse = $state<RecommendedCourses[number] | null>(null);
  let previewOpen = $state(false);
  let currentPage = $state(1);
  const search = new DebouncedSearch({
    onApply: () => {
      currentPage = 1;
    }
  });
  const pagination = $derived(libraryApi.recommendedCoursesPagination);

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

<CoursesPage
  courses={libraryApi.recommendedCourses}
  emptyTitle={$t(search.applied ? 'mp_workspace.no_results' : 'explore.empty_heading')}
  emptyDescription={$t(search.applied ? 'mp_workspace.adjust_search' : 'explore.empty_description')}
  isExplore={true}
  isLMS={true}
  isLoading={libraryApi.isLibraryLoading}
  bind:searchValue={search.draft}
  onSearchChange={(value) => search.input(value)}
  bind:sortKey={() => sortKey, changeSort}
  onCardClick={(course) => {
    selectedCourse = course as RecommendedCourses[number];
    previewOpen = true;
  }}
/>

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
{#if selectedCourse}<CoursePreviewModal course={selectedCourse} bind:open={previewOpen} />{/if}
