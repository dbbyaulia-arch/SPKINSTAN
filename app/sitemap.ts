import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.spkinstan.my.id', 
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];
}