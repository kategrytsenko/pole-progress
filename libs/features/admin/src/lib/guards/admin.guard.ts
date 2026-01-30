// TODO: removed if not used anymore
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from '@org/auth';

export const adminGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  // якщо ще грузиться — можна пустити, але краще редіректнути на "loading" (поки просто пускаємо)
//   if (auth.isLoading?.() === true) return true;

  if (!auth.isAuthed()) {
    return router.parseUrl('/sign-in'); // або '/' якщо немає сторінки
  }

  if (auth.role() !== 'admin') {
    return router.parseUrl('/forbidden'); // '/' або '/forbidden'
  }

  return true;
};
