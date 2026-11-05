const paths={
leaf:'M20 4C7 2 2 8 5 15c3 6 12 6 15-11ZM4 21 16 9m-7 7-1-6m6 1 4 1',
search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
animal:'M8 15c-3-3-5-2-5 0 0 3 5 5 9 5s9-2 9-5c0-2-2-3-5 0-1-5-7-5-8 0ZM6 5v3m5-5v4m5-3v4m4 0v3',
terrarium:'M8 3h8M9 3v4L3 19c-1 2 1 3 3 3h12c2 0 4-1 3-3L15 7V3M6 16h12m-6 0v-5m0 3 3-2',
compare:'M7 3v18M17 3v18M3 7l4-4 4 4m2 10 4 4 4-4M3 13h8m2-2h8',
arrow:'M4 12h16m-6-6 6 6-6 6',
close:'m6 6 12 12M6 18 18 6',
thermo:'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-7v11',
drop:'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Z',
sliders:'M4 7h16M4 17h16M8 4v6m8 4v6',
sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
book:'M3 4c5-2 9 0 9 2 0-2 4-4 9-2v16c-5-2-9 0-9 1 0-1-4-3-9-1V4Zm9 2v15',
check:'m5 12 4 4L19 6',
chevron:'m9 5 7 7-7 7',
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.leaf}"/></svg>`;
