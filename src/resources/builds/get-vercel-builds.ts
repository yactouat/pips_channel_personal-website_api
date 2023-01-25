import fetch from "node-fetch";

import { BuildResource as VercelDeployment } from "pips_resources_definitions/dist/resources";

const MASKED = "MASKED";

const getVercelBuilds = async (
  maskDeploymentsUid: boolean = false
): Promise<VercelDeployment[]> => {
  try {
    const vercelDeploymentsAPICall = await fetch(
      "https://api.vercel.com/v6/deployments",
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        },
        method: "GET",
      }
    );
    const vercelDeploymentsRes = await vercelDeploymentsAPICall.json();
    if (maskDeploymentsUid) {
      return vercelDeploymentsRes.deployments.map(
        (deployment: VercelDeployment) => {
          deployment.aliasAssigned = null;
          deployment.aliasError = null;
          deployment.buildingAt = null;
          deployment.created = null;
          deployment.createdAt = null;
          deployment.creator = null;
          deployment.inspectorUrl = MASKED;
          deployment.isRollbackCandidate = null;
          deployment.meta.githubCommitAuthorLogin = MASKED;
          deployment.meta.githubCommitRepoId = MASKED;
          deployment.meta.githubDeployment = MASKED;
          deployment.meta.githubRepoId = MASKED;
          deployment.meta.githubRepoOwnerType = MASKED;
          deployment.name = MASKED;
          deployment.state = MASKED;
          deployment.type = MASKED;
          deployment.uid = MASKED;
          deployment.url = MASKED;
          return deployment;
        }
      );
    }
    return vercelDeploymentsRes.deployments;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default getVercelBuilds;
