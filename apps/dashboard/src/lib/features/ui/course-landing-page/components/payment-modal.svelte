<script lang="ts">
  import { preventDefault } from '$lib/utils/functions/svelte';
  import { coursePaymentValidation } from '$lib/utils/functions/validator';
  import { courseApi } from '$features/course/api/course.svelte';

  import * as Dialog from '@cio/ui/base/dialog';
  import { InputField } from '@cio/ui/custom/input-field';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';

  interface Props {
    open?: boolean;
    paymentLink?: string;
    courseId?: string;
  }

  let { open = $bindable(false), paymentLink = '', courseId = '' }: Props = $props();

  let fields = $state({
    fullname: '',
    email: ''
  });

  let errors: Record<string, string> = $state({
    fullname: '',
    email: ''
  });

  const STEPS = {
    STEP_1: 'ENTER_DETAILS',
    STEP_2: 'GO_TO_PAYMENT'
  };

  let step = $state(STEPS.STEP_1);

  function resetForm() {
    step = STEPS.STEP_1;
    fields.fullname = '';
    fields.email = '';
    errors.fullname = '';
    errors.email = '';
  }

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;

    if (!isOpen) {
      resetForm();
    }
  }

  async function onSubmit() {
    errors = coursePaymentValidation(fields);

    if (Object.keys(errors).length) {
      return;
    }

    if (paymentLink && courseId) {
      step = STEPS.STEP_2;

      // Send payment request emails via backend
      await courseApi.createPaymentRequest(courseId, fields.email, fields.fullname);
    } else {
      open = false;
    }
  }

  function onClickPaymentLink() {
    open = false;
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="w-96">
    <Dialog.Header>
      <Dialog.Title>{$t('ui_shell.payment_modal.title')}</Dialog.Title>
    </Dialog.Header>
    {#if step === STEPS.STEP_1}
      <form onsubmit={preventDefault(onSubmit)}>
        <InputField
          label={$t('login.fields.full_name')}
          bind:value={fields.fullname}
          autoFocus={true}
          placeholder={$t('ui_shell.payment_modal.fullname_placeholder')}
          className="mb-4"
          isRequired={true}
          autoComplete={false}
          errorMessage={errors.fullname}
        />
        <InputField
          label={$t('course.navItem.landing_page.email')}
          bind:value={fields.email}
          placeholder={$t('ui_shell.payment_modal.email_placeholder')}
          className="mb-4"
          isRequired={true}
          autoComplete={false}
          errorMessage={errors.email}
        />

        <div class="mt-5 flex flex-row-reverse items-center">
          <Button type="submit">
            {paymentLink ? $t('app.next') : $t('course.navItem.people.invite_modal.finish')}
          </Button>
        </div>
      </form>
    {:else if step === STEPS.STEP_2}
      <p>{$t('ui_shell.payment_modal.redirect_notice')}</p>
      <div class="mt-5 flex flex-row-reverse items-center">
        <a href={paymentLink} target="_blank" onclick={onClickPaymentLink} class="text-sm font-semibold"
          >{$t('ui_shell.payment_modal.go_to_payment')}</a
        >
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
