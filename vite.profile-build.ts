export const isProfileBuild = process.env.VSMUX_PROFILE_BUILD === "1";

export const profileBuildOverrides = isProfileBuild
  ? {
      minify: false,
      sourcemap: true,
    }
  : {};
