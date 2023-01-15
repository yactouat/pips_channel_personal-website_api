import { fetchBlogPostsMetadataFromFileSystem } from "./../../../src/resources/blog-posts/blog-posts";

const MOCK_POSTS_DIR = "MOCK_posts";

describe("fsBlogPostsFetcher", () => {
  describe("should not include blog post with wrong metadata", () => {
    test("count of posts should be 2 (the number of valid mock posts)", () => {
      const expected = 2;
      const actual =
        fetchBlogPostsMetadataFromFileSystem(MOCK_POSTS_DIR).length;
      expect(expected).toEqual(actual);
    });

    test("post with wrong meta data should not be present", () => {
      const actual = fetchBlogPostsMetadataFromFileSystem(MOCK_POSTS_DIR).find(
        (post) => post.slug === "wrong-metadata-blog-post"
      );
      expect(actual).toBeUndefined();
    });

    test("posts metadata should be sorted by date DESC", () => {
      const actual = fetchBlogPostsMetadataFromFileSystem(MOCK_POSTS_DIR)[0];
      expect(actual.slug).toEqual("newest-blog-post");
    });
  });
});
