import { useState } from 'react';

export function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(dark) {
  const root = document.documentElement;
  dark ? root.classList.add('dark') : root.classList.remove('dark');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}
