/** Per-site settings for the mailing list signup (the code in index.ts is shared with rnc-web). */
export const signupConfig = {
  siteName: 'Swedenborg Centre',
  /** Production origin, used in confirmation links (other environments use the request origin). */
  siteUrl: 'https://swedenborg.com.au',
  from: 'Swedenborg Centre <info@swedenborg.com.au>',
  replyTo: 'info@swedenborg.com.au',
  contactPhone: '+61 2 9416 2812',
  /** rnc-web paths have no trailing slash; sc-www uses trailing slashes everywhere. */
  trailingSlash: true,
  /**
   * The lists people can pick. `option` is the exact option name of the "Communication preferences"
   * checkbox field in Planning Center.
   */
  lists: [
    { id: 'centre', label: 'Swedenborg Centre news', hint: 'The monthly Swedenborg Centre enews', option: 'Swedenborg Centre news', checked: true },
    { id: 'candela', label: 'Candela', hint: 'The Candela magazine, by email', option: 'Candela', checked: false },
  ],
};
export type SignupList = (typeof signupConfig.lists)[number];
