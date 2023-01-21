import fetch from "node-fetch";

type VercelDeploymentState = "ERROR" | "READY";

interface VercelDeployment {
  meta: {
    githubCommitRef: string;
    githubCommitSha: string;
    githubRepoId: string;
  };
  state: VercelDeploymentState;
  uid: string;
}

// TODO better observability here
const postVercelBuild = async (vercelToken: string): Promise<boolean> => {
  let buildWentThrough = false;
  if (vercelToken === process.env.VERCEL_TOKEN) {
    try {
      // fetching list of deployments
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
      // looping through deployments to find the latest ready one from GitOps
      for (let i = 0; i < vercelDeploymentsRes.deployments.length; i++) {
        const deployment: VercelDeployment =
          vercelDeploymentsRes.deployments[i];
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
    } catch (error) {
      console.log(error);
    }
  }
  return buildWentThrough;
};

export default postVercelBuild;
