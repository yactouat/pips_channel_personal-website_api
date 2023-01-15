import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface BlogPostMetaData {
  date: string;
  slug: string;
  title: string;
}

export const fetchBlogPostsFromFileSystem = (
  postsDir: string
): BlogPostMetaData[] => {
  // Get file names under /posts
  const postsFileNames = fs.readdirSync(path.join(process.cwd(), postsDir));
  const postsMetaData: {}[] = postsFileNames
    .map((fileName) => {
      // Remove ".md" from file name to get their slug
      const postSlug = fileName.replace(/\.md$/, "");
      // Read markdown file as an utf-8 encoded string
      const fullPath = path.join(postsDir, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      // Use gray-matter to parse the post metadata section
      const postMetadata = matter(fileContents);
      if (
        !postMetadata.data.date ||
        !postMetadata.data.slug ||
        !postMetadata.data.title
      ) {
        return {};
      }
      // Combine the metadata with the slug
      return {
        date: postMetadata.data.date,
        slug: postSlug,
        title: postMetadata.data.title,
      };
    })
    // filtering out the posts that don't have the required metadata
    .filter((postMetaData) => {
      return postMetaData.date && postMetaData.slug && postMetaData.title;
    });
  // Sort posts by date DESC
  return (postsMetaData as BlogPostMetaData[]).sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
};
