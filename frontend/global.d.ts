declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module 'next' {
  export type Metadata = any;
}

declare module 'next/font/google' {
  export const Inter: any;
}

declare module 'next/dynamic' {
  const dynamic: any;
  export default dynamic;
}


declare module 'next/link' {
  const Link: any;
  export default Link;
}

declare module 'next/navigation' {
  export const useRouter: any;
  export const usePathname: any;
  export const useSearchParams: any;
  export const useParams: any;
}



