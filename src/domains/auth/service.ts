import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword, needsRehash } from '@/lib/auth/password';
import { createSession, deleteSession, deleteAllUserSessions } from '@/lib/auth/session';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { PASSWORD_RESET_TOKEN_DURATION, APP_URL } from '@/lib/constants';
import { sendEmail, emailLayout, emailButton } from '@/services/brevo';
import { CartService } from '@/domains/cart/service';
import type { RegisterData as RegisterInput, LoginData as LoginInput } from '@/lib/validations/auth';
import type { GoogleProfile } from '@/services/google';

/** User-facing error: safe to show to the visitor. */
export class AuthServiceError extends Error {}

// Real hash (computed once) so login costs the same whether or not the email exists.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken(8)));

export class AuthService {
  static async register(input: RegisterInput) {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new AuthServiceError('An account with this email already exists');

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName || null,
        phone: input.phone || null,
        role: 'CUSTOMER',
        customer: { create: {} },
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    await createSession(user.id);
    await CartService.mergeGuestCart(user.id).catch(() => {});
    return user;
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

    // Always run bcrypt so response timing doesn't reveal which emails exist.
    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !valid) throw new AuthServiceError('Invalid email or password');
    if (!user.isActive) throw new AuthServiceError('This account is disabled. Please contact support.');

    // The only awaited write is the session itself; bookkeeping runs after the response is on its way.
    await createSession(user.id);
    void prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), ...(needsRehash(user.passwordHash) ? { passwordHash: await hashPassword(input.password) } : {}) },
      })
      .catch(() => {});
    await CartService.mergeGuestCart(user.id).catch(() => {}); // no-op (no query) unless a guest cart cookie exists

    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
  }

  /**
   * Sign in or register with a Google profile. Matches by Google id first, then links an existing
   * account with the same (Google-verified) email, otherwise creates a customer account.
   */
  static async loginWithGoogle(profile: GoogleProfile) {
    if (!profile.emailVerified) throw new AuthServiceError('Your Google email is not verified.');

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: profile.sub, emailVerified: true, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.sub,
            // No password yet: a random, unknown one. "Forgot password" lets them set one later.
            passwordHash: await hashPassword(randomToken(32)),
            firstName: profile.givenName,
            lastName: profile.familyName,
            role: 'CUSTOMER',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            customer: { create: {} },
          },
        });
      }
    }
    if (!user.isActive) throw new AuthServiceError('This account is disabled. Please contact support.');

    await createSession(user.id);
    void prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
    await CartService.mergeGuestCart(user.id).catch(() => {});
    return { id: user.id, role: user.role };
  }

  static async logout() {
    await deleteSession();
  }

  /** Always resolves the same way so account existence is not revealed. */
  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) return { success: true };

    const token = randomToken(32);
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: sha256(token), // only the hash is stored
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_DURATION),
        },
      }),
    ]);

    const link = `${APP_URL}/reset-password?token=${token}`;
    await sendEmail({
      type: 'PASSWORD_RESET',
      to: user.email,
      subject: 'Reset your The Lakeside password',
      devLink: link,
      html: emailLayout(
        'Reset your password',
        `<p>Hi ${user.firstName ? user.firstName.replace(/[<>&"]/g, '') : 'there'},</p>
         <p>We received a request to reset your password. This link works once and expires in 1 hour.</p>
         ${emailButton(link, 'Choose a new password')}
         <p style="color:#6b6b70;font-size:13px">If you didn't ask for this, you can safely ignore this email.</p>`
      ),
    });

    return { success: true };
  }

  static async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findFirst({
      where: { token: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new AuthServiceError('This reset link is invalid or has expired');

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { success: true };
  }

  static async changePassword(userId: string, current: string, next: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(current, user.passwordHash))) {
      throw new AuthServiceError('Current password is incorrect');
    }
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
    await deleteAllUserSessions(userId);
    await createSession(userId);
  }
}
