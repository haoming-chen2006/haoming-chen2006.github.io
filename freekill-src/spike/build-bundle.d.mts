/** Root of the FreeKill engine checkout the bundle is read from. */
export declare const ENGINE_ROOT: string;
/** path -> Lua source, for every .lua under lua/, the shipped packages, and the web overlay. */
export declare function buildBundle(): Record<string, string>;
