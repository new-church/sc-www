export const site = {
  title: 'Swedenborg Centre',
  url: 'https://swedenborg.com.au',
  lang: 'en-AU',
  timeZone: 'Australia/Sydney',
  author: 'Joe Vandermeer',
  description:
    "The Swedenborg Centre, for many decades since being established in Sydney, Australia, has been offering useful events, discussions and material about spiritual life and the spiritual world from the unique experiences and writings of Emanuel Swedenborg. Our aim is to help us prepare for richer experiences ahead, and to relate Swedenborg's writings to our lives.",
  email: 'info@swedenborg.com.au',
  facebook: 'https://www.facebook.com/Swedenborg-Association-of-Australia-104862382911851/',
  // Large files (audio, PDFs) live in object storage; content refers to them by path.
  // Today this is the GitHub Pages host; it becomes the Vercel Blob / redirect host after migration.
  staticUrl: import.meta.env.PUBLIC_STATIC_URL ?? 'https://static.swedenborg.com.au/',
};

export const mainMenu = [
  { name: 'home', url: '/' },
  { name: 'events', url: '/events/' },
  { name: 'news', url: '/news/' },
  { name: 'shop', url: '/shop/' },
  {
    name: 'resources',
    url: '/resources/',
    children: [
      { name: 'candela', url: '/candela/' },
      { name: 'audio', url: '/resources/audio/' },
      { name: 'PDFs', url: '/resources/pdf-downloads/' },
      { name: 'links', url: '/resources/links/' },
    ],
  },
  {
    name: 'about',
    url: '/about/',
    children: [
      { name: 'contact', url: '/contact/' },
      { name: 'Swedenborg', url: '/emanuel-swedenborg/' },
    ],
  },
];

export const footerMenu = [
  { name: 'Home', url: '/' },
  { name: 'Events', url: '/events/' },
  { name: 'News', url: '/news/' },
  { name: 'Shop', url: '/shop/' },
  { name: 'Swedenborg', url: '/emanuel-swedenborg/' },
  { name: 'Contact', url: '/contact/' },
];

export const footerResources = [
  { name: 'Candela', url: '/candela/' },
  { name: 'Audio', url: '/resources/audio/' },
  { name: 'PDFs', url: '/resources/pdf-downloads/' },
  { name: 'Links', url: '/resources/links/' },
];

export const staticHref = (path: string) => site.staticUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
