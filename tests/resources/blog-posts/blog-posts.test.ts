import { fetchBlogPostsFromFileSystem } from "./../../../src/resources/blog-posts/blog-posts";

describe("fsBlogPostsFetcher", () => {
  describe("should not include blog post with wrong metadata", () => {
    test("count of posts should be 2 (the number of valid mock posts)", () => {
      const expected = 2;
      const actual = fetchBlogPostsFromFileSystem(
        "tests/resources/blog-posts/MOCK_posts"
      ).length;
      expect(expected).toEqual(actual);
    });

    test("post with wrong meta data should not be present", () => {
      const actual = fetchBlogPostsFromFileSystem(
        "tests/resources/blog-posts/MOCK_posts"
      ).find((post) => post.slug === "wrong-metadata-blog-post");
      expect(actual).toBeUndefined();
    });

    test("posts metadata should be sorted by date DESC", () => {
      const actual = fetchBlogPostsFromFileSystem(
        "tests/resources/blog-posts/MOCK_posts"
      )[0];
      expect(actual.slug).toEqual("newest-blog-post");
    });
  });
});
