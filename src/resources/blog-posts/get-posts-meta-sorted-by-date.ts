import { BlogPostResource } from "pips_resources_definitions/dist/resources";

const getPostsMetaSortedByDate = (
  posts: BlogPostResource[]
): {
  date: string;
  slug: string;
  title: string;
}[] => {
  return posts
    .sort((a, b) => {
      return a.date < b.date ? 1 : -1;
    })
    .map((post) => {
      return {
        date: post.date,
        slug: post.slug,
        title: post.title,
      };
    });
};

export default getPostsMetaSortedByDate;
