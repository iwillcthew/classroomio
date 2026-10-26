import { z } from 'zod';
import { defineEmail } from '../send';
import { escapeHtml } from '../utils/functions/email-helpers';
import { getDefaultTemplate } from '../templates';

export const employeeActivationEmail = defineEmail({
  id: 'employeeActivation',
  subject: 'Kích hoạt tài khoản MP Learning',
  schema: z.object({ name: z.string().min(1), employeeCode: z.string().min(1), link: z.url() }),
  render: (fields) => {
    const name = escapeHtml(fields.name);
    const employeeCode = escapeHtml(fields.employeeCode);
    const link = escapeHtml(fields.link);
    const content = `<p>Xin chào ${name},</p><p>Bạn đã được cấp tài khoản MP Learning với mã nhân viên <strong>${employeeCode}</strong>.</p><p>Hãy kích hoạt tài khoản và đặt mật khẩu để bắt đầu học.</p><p><a class="button" href="${link}">Kích hoạt tài khoản</a></p><p>Liên kết có hiệu lực trong 48 giờ và chỉ dùng một lần. Sau khi kích hoạt, đăng nhập bằng mã nhân viên và mật khẩu của bạn.</p>`;
    return getDefaultTemplate(content);
  }
});
