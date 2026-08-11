export async function revokeClinicSession(): Promise<void> {
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function signOutClinic(): Promise<void> {
  try {
    await revokeClinicSession();
  } finally {
    window.location.assign('/cl-login');
  }
}
