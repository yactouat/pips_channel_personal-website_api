import { Request } from "express";

const compareIdWithToken = (req: Request, userId: number): boolean => {
  try {
    const authedUser = JSON.parse(req.params.authedUser);
    return authedUser.id == userId;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export default compareIdWithToken;
