import { Composition, Still } from "remotion";
import { Ad, FPS, DURATION } from "./Ad";
import { SiteClip, SITE_FPS, SITE_DURATION } from "./SiteClip";
import { InstaPhoto, InstaColorways, AppColorways, AppDark, AppBlocks, AppAgreed, AppBlueYellow, AppFlipped, AppBrand, InstaReel, INSTA_FPS, REEL_DURATION } from "./Insta";
export const Root = () => <>
  <Composition id="Ad" component={Ad} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
  <Composition id="SiteClip" component={SiteClip} durationInFrames={SITE_DURATION} fps={SITE_FPS} width={1080} height={2208} />
  <Composition id="InstaReel" component={InstaReel} durationInFrames={REEL_DURATION} fps={INSTA_FPS} width={1080} height={1920} />
  <Still id="InstaPhoto" component={InstaPhoto} width={1080} height={1350} />
  <Still id="InstaColorways" component={InstaColorways} width={2160} height={2700} />
  <Still id="AppColorways" component={AppColorways} width={2200} height={2130} />
  <Still id="AppDark" component={AppDark} width={1780} height={2280} />
  <Still id="AppBlocks" component={AppBlocks} width={2230} height={3110} />
  <Still id="AppAgreed" component={AppAgreed} width={2200} height={2130} />
  <Still id="AppBlueYellow" component={AppBlueYellow} width={1680} height={2180} />
  <Still id="AppFlipped" component={AppFlipped} width={2200} height={2130} />
  <Still id="AppBrand" component={AppBrand} width={2230} height={3110} />
</>;
