import fetch from "node-fetch";

const MASKED = "MASKED";

type VercelDeploymentState = "ERROR" | "READY" | "MASKED";

interface VercelDeployment {
  aliasAssigned: number | null;
  aliasError: string | null;
  buildingAt: number | null;
  created: number | null;
  createdAt: number | null;
  creator: {
    email: string;
    githubLogin: string;
    uid: string;
    username: string;
  } | null;
  inspectorUrl: string;
  isRollbackCandidate: boolean | null;
  meta: {
    githubCommitAuthorLogin: string;
    githubCommitAuthorName: string;
    githubCommitMessage: string;
    githubCommitOrg: string;
    githubCommitRef: string;
    githubCommitRepo: string;
    githubCommitRepoId: string;
    githubCommitSha: string;
    githubDeployment: string;
    githubOrg: string;
    githubRepo: string;
    githubRepoId: string;
    githubRepoOwnerType: string;
  };
  name: string;
  ready: number;
  state: VercelDeploymentState;
  type: string;
  uid: string;
  url: string;
}

// TODO better observability here

export const getVercelBuilds = async (
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

export const postVercelBuild = async (
  vercelToken: string
): Promise<boolean> => {
  let buildWentThrough = false;
  try {
    // fetching list of deployments
    const vercelDeployments = await getVercelBuilds();
    // looping through deployments to find the latest ready one from GitOps
    for (let i = 0; i < vercelDeployments.length; i++) {
      const deployment: VercelDeployment = vercelDeployments[i];
      // found the latest ready deployment
      if (deployment.state == "READY") {
        // call for triggering a new build
        const vercelBuildAPICall = await fetch(
          "https://api.vercel.com/v13/deployments",
          {
            // payload consists of the build command, the name of the project, and the git repo data
            body: JSON.stringify({
              // buildCommand: "npm run build",
              gitSource: {
                ref: deployment.meta.githubCommitRef,
                repoId: deployment.meta.githubRepoId,
                type: "github",
              },
              name: process.env.VERCEL_PROJECT,
              target: "production",
            }),
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
            method: "POST",
          }
        );
        const vercelBuildRes = await vercelBuildAPICall.json();
        // so I can see the logs in the cloud
        console.log(vercelBuildRes);
        buildWentThrough = vercelBuildAPICall.status == 200;
        break;
      }
    }
    // delete previous deployments starting n-2
    if (buildWentThrough && vercelDeployments.length > 2) {
      const previousDeployments = vercelDeployments.slice(2);
      for (let i = 0; i < previousDeployments.length; i++) {
        await fetch(
          `https://api.vercel.com/v13/deployments/${previousDeployments[i].uid}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
            method: "DELETE",
          }
        );
      }
    }
  } catch (error) {
    console.log(error);
  }
  return buildWentThrough;
};
