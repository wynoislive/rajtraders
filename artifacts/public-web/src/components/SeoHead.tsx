import { useEffect } from 'react';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  productData?: {
    name: string;
    description: string;
    image: string;
    priceCents: number;
    currency?: string;
    category?: string;
    slug: string;
    inStock?: boolean;
    prepTimeMinutes?: number;
  };
  breadcrumbs?: Array<{ name: string; item: string }>;
  noIndex?: boolean;
}

export function SeoHead({
  title = 'RAJ TRADERS — Gourmet Bakery, Artisanal Cakes & Party Supplies',
  description = 'Order artisanal cakes, gourmet bakery items, and party decorations with fast local delivery in Birsingpur Pali.',
  image = 'https://sundarvan.xyz/RAJTRADERS-LOGO.png',
  url = typeof window !== 'undefined' ? window.location.href : 'https://sundarvan.xyz',
  type = 'website',
  productData,
  breadcrumbs,
  noIndex = false,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes('RAJ TRADERS') ? title : `${title} | RAJ TRADERS`;
    document.title = fullTitle;

    const setMeta = (nameAttr: string, valAttr: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${valAttr}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, valAttr);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard Meta
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, follow' : 'index, follow');

    // Open Graph Meta
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', 'RAJ TRADERS');

    // Twitter Card Meta
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url.split('?')[0]);

    // Structured Data (JSON-LD)
    let jsonLdScript = document.getElementById('json-ld-seo-schema') as HTMLScriptElement | null;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'json-ld-seo-schema';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    const schemas: any[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        'name': 'RAJ TRADERS',
        'image': 'https://sundarvan.xyz/RAJTRADERS-LOGO.png',
        '@id': 'https://sundarvan.xyz/#organization',
        'url': 'https://sundarvan.xyz',
        'telephone': '+91-9800000000',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': 'Main Road',
          'addressLocality': 'Birsingpur Pali',
          'addressRegion': 'MP',
          'postalCode': '484221',
          'addressCountry': 'IN'
        },
        'openingHoursSpecification': {
          '@type': 'OpeningHoursSpecification',
          'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          'opens': '08:00',
          'closes': '22:00'
        }
      }
    ];

    if (productData) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': productData.name,
        'image': [productData.image],
        'description': productData.description,
        'sku': productData.slug,
        'brand': {
          '@type': 'Brand',
          'name': 'RAJ TRADERS'
        },
        'offers': {
          '@type': 'Offer',
          'url': `https://sundarvan.xyz/products/${productData.slug}`,
          'priceCurrency': productData.currency || 'INR',
          'price': (productData.priceCents / 100).toFixed(2),
          'itemCondition': 'https://schema.org/NewCondition',
          'availability': (productData.inStock ?? true) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          'seller': {
            '@type': 'Organization',
            'name': 'RAJ TRADERS'
          }
        }
      });
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          'position': idx + 1,
          'name': b.name,
          'item': b.item
        }))
      });
    }

    jsonLdScript.textContent = JSON.stringify(schemas, null, 2);
  }, [title, description, image, url, type, productData, breadcrumbs, noIndex]);

  return null;
}
