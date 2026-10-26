import bcrypt from 'bcrypt';

export async function hashAuthPassword(password: string) {
  return bcrypt.hash(password, 10);
}
