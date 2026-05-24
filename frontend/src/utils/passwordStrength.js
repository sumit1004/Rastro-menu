export function getPasswordStrength(password) {
  if (!password) {
    return { score: 0, label: '', percent: 0 };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const capped = Math.min(score, 5);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#16a34a'];

  return {
    score: capped,
    label: labels[capped],
    color: colors[capped],
    percent: (capped / 5) * 100,
  };
}

export function validateStrongPassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Include at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Include at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Include at least one number.';
  }
  return null;
}
