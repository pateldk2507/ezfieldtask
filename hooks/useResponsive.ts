import { useWindowDimensions, Platform } from "react-native";

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const showSidebar = isWeb && !isMobile;
  const contentMaxWidth = isDesktop ? 900 : isTablet ? 700 : undefined;
  const wideContentMaxWidth = isDesktop ? 1200 : isTablet ? 900 : undefined;

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    showSidebar,
    contentMaxWidth,
    wideContentMaxWidth,
  };
}
