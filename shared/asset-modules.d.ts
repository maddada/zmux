declare module "*.css" {
  const cssUrl: string;
  export default cssUrl;
  /*
   * CDXC:Typecheck 2026-04-27-17:03
   * Native sidebar entrypoints import bundled CSS for side effects. Keep CSS
   * modules typed in the root project so editor checks do not treat styling
   * imports as missing runtime modules.
   */
}

declare module "*.svg" {
  const svgUrl: string;
  export default svgUrl;
}
