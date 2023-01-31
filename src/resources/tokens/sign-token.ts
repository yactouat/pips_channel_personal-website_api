import jwt from "jsonwebtoken";

interface UserTokenPayload {
  email: string;
}

const signToken = async (payload: UserTokenPayload): Promise<string> => {
  const token = await jwt.sign(
    { email: payload.email },
    process.env.JWT_SECRET as string
  );
  return token;
};

export default signToken;
