import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: '프롤로그 스토리',
    description: '만남과 가치관에 대한 프롤로그 팀의 이야기',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/story/${post.id}`,
    })),
  });
}
