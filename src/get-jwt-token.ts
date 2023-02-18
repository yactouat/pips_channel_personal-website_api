const getJwtToken = (authHeader: string | null = null): string => {
  if (authHeader == null || !authHeader.startsWith("Bearer")) {
    throw new Error("No JWT token found");
  }
  return authHeader.slice(7);
};

export default getJwtToken;
