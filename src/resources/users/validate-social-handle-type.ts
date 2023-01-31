import { SocialHandleType } from "pips_resources_definitions/dist/types";

const validateSocialHandleType = (
  socialHandleType: SocialHandleType
): socialHandleType is SocialHandleType => {
  return ["GitHub", "LinkedIn"].includes(socialHandleType);
};

export default validateSocialHandleType;
