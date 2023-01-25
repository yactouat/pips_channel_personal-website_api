import matter from "gray-matter";

import { BlogPostResource } from "pips_resources_definitions/dist/resources";

const extractPostDataFromRawPost = (
  postContents: string,
  slug?: string
): BlogPostResource => {
  // Use gray-matter to parse the post metadata section
  const postMetadata = matter(postContents);
  if (
    postMetadata.data.date == undefined ||
    postMetadata.data.slug == undefined ||
    postMetadata.data.title == undefined
  ) {
    throw new Error("post metadata is missing");
  }
  // Combine the metadata with the slug and add the post contents
  const returnedSlug = slug == undefined ? postMetadata.data.slug : slug;
  return {
    contents: postMetadata.content,
    date: postMetadata.data.date,
    slug: returnedSlug,
    title: postMetadata.data.title,
  };
};

export default extractPostDataFromRawPost;
