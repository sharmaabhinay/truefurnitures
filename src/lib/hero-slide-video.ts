/** The showcase belongs only to slide four; CMS videos stay on slide one. */
export function heroSlideVideo(index: number, configuredVideo: string, showcaseVideo: string): string {
  if (index === 3) return showcaseVideo;
  return index === 0 ? configuredVideo : "";
}