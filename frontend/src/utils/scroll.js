const NAV_OFFSET = 80;

export const scrollToSection = (sectionId) => {
  const el = document.getElementById(sectionId);
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top, behavior: 'smooth' });
};

export const scrollToHash = (hash) => {
  const id = hash?.replace(/^#/, '');
  if (id) scrollToSection(id);
};
