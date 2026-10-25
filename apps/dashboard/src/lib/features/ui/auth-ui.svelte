<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { t } from '$lib/utils/functions/translations';
  import { currentOrg } from '$lib/utils/store/org';
  import { GoogleIconColored } from '$features/ui/icons';
  import { authClient } from '$lib/utils/services/auth/client';
  import { snackbar } from '$features/ui/snackbar/store';
  import * as Card from '@cio/ui/base/card';
  import { Button } from '@cio/ui/base/button';
  import { Separator } from '@cio/ui/base/separator';
  import { preventDefault } from '$lib/utils/functions/svelte';
  import { ROUTE } from '$lib/utils/constants/routes';
  import { BRAND } from '$lib/utils/constants/brand';
  import { env } from '$env/dynamic/public';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
  import LockIcon from '@lucide/svelte/icons/lock';

  interface Props {
    isLogin?: boolean;
    showOnlyContent?: boolean;
    isLoading?: boolean;
    showLogo?: boolean;
    hideGoogleAuth?: boolean;
    redirectPathname?: string;
    newUserCallbackPathname?: string;
    handleSubmit?: () => void;
    children?: Snippet;
    getPasswordAuthAlternative?: Snippet;
  }

  let {
    isLogin = true,
    showOnlyContent = false,
    isLoading = false,
    showLogo = false,
    hideGoogleAuth = false,
    redirectPathname = '',
    newUserCallbackPathname,
    handleSubmit = () => {},
    children,
    getPasswordAuthAlternative
  }: Props = $props();

  async function signInWithGoogle() {
    if (isLoading) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const pathname = redirectPathname || params.get('redirect') || '';
    const redirectTo = `${window.location.origin + pathname}`;
    const errorCallbackURL = `${window.location.origin + ROUTE.AUTH_FAILED}`;
    const newUserCallbackURL = newUserCallbackPathname
      ? `${window.location.origin}${newUserCallbackPathname}`
      : undefined;

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: redirectTo,
        errorCallbackURL,
        ...(newUserCallbackURL ? { newUserCallbackURL } : {})
      });

      if (result?.error) {
        snackbar.error('snackbar.social_auth_not_enabled');
      }
    } catch (error) {
      console.log('catch error', error);
    }
  }

  const authBackgroundUrl = $derived($currentOrg.customization.auth?.backgroundImage?.trim() ?? '');
  const googleEnabled = env.PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
  const headlineLines = $derived($t('mp_learning.headline').split('\n'));
  const features = [
    {
      icon: BookOpenIcon,
      titleKey: 'mp_learning.feature_paths',
      descriptionKey: 'mp_learning.feature_paths_description'
    },
    {
      icon: BadgeCheckIcon,
      titleKey: 'mp_learning.feature_practice',
      descriptionKey: 'mp_learning.feature_practice_description'
    },
    {
      icon: ChartColumnIcon,
      titleKey: 'mp_learning.feature_progress',
      descriptionKey: 'mp_learning.feature_progress_description'
    }
  ];
</script>

<div class="mp-auth">
  <aside class="mp-auth-story">
    <svg class="mp-chevrons" viewBox="0 0 600 800" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <path d="M330 -20 L450 -20 L250 820 L130 820 Z" fill-opacity="0.06" />
      <path d="M450 -20 L530 -20 L330 820 L250 820 Z" fill-opacity="0.11" />
      <path d="M530 -20 L620 -20 L620 120 L420 820 L330 820 Z" fill-opacity="0.05" />
    </svg>
    <img src={BRAND.logo} alt={BRAND.name} class="mp-brand" />
    <div class="mp-story-copy">
      <p class="mp-eyebrow"><span></span>{$t('mp_learning.eyebrow')}</p>
      <h1>
        {#each headlineLines as line, index (index)}
          <span class:mp-headline-accent={index > 0}>{line}</span>
        {/each}
      </h1>
      <p class="mp-description">{$t('mp_learning.description')}</p>
      <ul class="mp-features">
        {#each features as feature (feature.titleKey)}
          {@const Icon = feature.icon}
          <li>
            <span class="mp-feature-icon"><Icon size={18} class="custom" /></span>
            <span>
              <strong>{$t(feature.titleKey)}</strong>
              <small>{$t(feature.descriptionKey)}</small>
            </span>
          </li>
        {/each}
      </ul>
    </div>
    <p class="mp-story-footer"><LockIcon size={14} class="custom" />{$t('mp_learning.internal')}</p>
  </aside>
  <main class="mp-auth-main" style:background-image={authBackgroundUrl ? `url("${authBackgroundUrl}")` : undefined}>
    <div class="mp-auth-form">
      <Card.Root class="w-full border-0 bg-transparent shadow-none">
        {#if !showOnlyContent || showLogo}
          <Card.Header class="flex flex-col items-start gap-2 pb-2">
            <a href={resolve(ROUTE.HOME, {})} class="mp-mobile-brand">
              <img src={BRAND.logo} alt={BRAND.name} />
            </a>

            {#if !showOnlyContent}
              <Card.Title class="text-2xl font-bold tracking-tight md:text-3xl">
                {isLogin ? $t('login.welcome') : $t('login.create_account')}
              </Card.Title>
              {#if isLogin}
                <Card.Description class="text-base">{$t('mp_learning.sign_in_description')}</Card.Description>
              {/if}
            {/if}
          </Card.Header>
        {/if}

        <Card.Content>
          <form onsubmit={preventDefault(handleSubmit)}>
            {@render children?.()}
          </form>

          {#if !showOnlyContent && (getPasswordAuthAlternative || (!hideGoogleAuth && googleEnabled))}
            <div class="mt-6 flex flex-col gap-6">
              <div class="relative flex items-center justify-center">
                <Separator />
                <span class="ui:bg-card ui:text-muted-foreground absolute px-2 text-sm"
                  >{$t('login.continue_with')}</span
                >
              </div>

              {#if getPasswordAuthAlternative}
                {@render getPasswordAuthAlternative()}
              {:else}
                <Button variant="outline" onclick={signInWithGoogle} disabled={isLoading} class="w-full">
                  <GoogleIconColored />
                  <span>
                    {isLogin ? $t('login.login_with_google') : $t('login.signup_with_google')}
                  </span>
                </Button>
              {/if}
            </div>
          {/if}
        </Card.Content>
        {#if !showOnlyContent}
          <Card.Footer class="flex-col gap-2 border-t pt-6">
            <p class="ui:text-muted-foreground text-center text-sm">
              {#if isLogin}
                {$t('mp_learning.invitation_hint')}
                <a class="ui:text-primary hover:underline" href="/signup{page.url.search}"
                  >{$t('mp_learning.activate')}</a
                >
              {:else}
                {$t('login.already_have_account')}
                <a class="ui:text-primary hover:underline" href="/login{page.url.search}">{$t('login.login')}</a>
              {/if}
            </p>
          </Card.Footer>
        {/if}
      </Card.Root>
    </div>
  </main>
</div>

<style>
  .mp-auth {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-height: 100svh;
    background: var(--card);
  }
  .mp-auth-story {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 3rem;
    padding: clamp(2rem, 5vw, 4.5rem);
    background: var(--facet-gradient);
    color: #ffffff;
  }
  .mp-chevrons {
    position: absolute;
    inset: 0 0 0 auto;
    z-index: -1;
    height: 100%;
    width: auto;
    fill: #ffffff;
  }
  .mp-brand {
    width: min(100%, 260px);
    height: auto;
    filter: brightness(0) invert(1);
  }
  .mp-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.9rem;
    border: 1px solid rgb(255 255 255 / 22%);
    border-radius: 999px;
    background: rgb(255 255 255 / 8%);
    font-size: 0.8rem;
    font-weight: 500;
  }
  .mp-eyebrow span {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: var(--brand-cyan);
  }
  h1 {
    display: flex;
    flex-direction: column;
    margin: 1.5rem 0 1.25rem;
    max-width: 620px;
    font-size: clamp(2.2rem, 3.6vw, 3.6rem);
    line-height: 1.12;
    font-weight: 700;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .mp-headline-accent {
    color: #9be3ff;
  }
  .mp-description {
    max-width: 480px;
    font-size: 1.05rem;
    line-height: 1.7;
    color: rgb(255 255 255 / 80%);
  }
  .mp-features {
    display: grid;
    gap: 0.75rem;
    max-width: 520px;
    margin-top: 2.25rem;
  }
  .mp-features li {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.85rem 1rem;
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: 0.75rem;
    background: rgb(255 255 255 / 6%);
  }
  .mp-features strong {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
  }
  .mp-features small {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.8rem;
    color: rgb(255 255 255 / 70%);
  }
  .mp-feature-icon {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.6rem;
    background: rgb(255 255 255 / 14%);
    color: #ffffff;
  }
  .mp-story-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: rgb(255 255 255 / 70%);
  }
  .mp-auth-main {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.25rem;
    background-size: cover;
  }
  .mp-auth-form {
    width: 100%;
    max-width: 420px;
  }
  .mp-mobile-brand {
    display: none;
  }
  @media (max-width: 900px) {
    .mp-auth {
      grid-template-columns: 1fr;
    }
    .mp-auth-story {
      display: none;
    }
    .mp-mobile-brand {
      display: block;
      width: 220px;
      margin-bottom: 1rem;
    }
    .mp-mobile-brand img {
      width: 100%;
      height: auto;
    }
  }
</style>
