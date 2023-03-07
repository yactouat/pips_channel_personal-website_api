import bcrypt from "bcrypt";

const hashUserPassword = async (plainPassword: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  return hashedPassword;
};

export default hashUserPassword;
