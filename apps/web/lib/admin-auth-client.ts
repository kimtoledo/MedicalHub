export async function revokeAdminSession(): Promise<void> {
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function signOutAdmin(): Promise<void> {
  try {
    await revokeAdminSession();
  } finally {
    window.location.assign('/dentra-admin/login');
  }
}
