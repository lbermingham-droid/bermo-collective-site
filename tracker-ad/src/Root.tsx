import { Composition } from "remotion";
import { Ad, FPS, DURATION } from "./Ad";
import { SiteClip, SITE_FPS, SITE_DURATION } from "./SiteClip";
export const Root = () => <>
  <Composition id="Ad" component={Ad} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
  <Composition id="SiteClip" component={SiteClip} durationInFrames={SITE_DURATION} fps={SITE_FPS} width={1080} height={2208} />
</>;
