'use client';

import Script from 'next/script';

interface JsonLdProps {
    type?: 'Photographer' | 'WebSite' | 'ImageObject';
    data?: any;
}

export default function JsonLd({ type = 'Photographer', data }: JsonLdProps) {
    let schema: any = {};

    if (type === 'Photographer') {
        schema = {
            '@context': 'https://schema.org',
            '@type': 'Person',
            'name': 'DAITAN',
            'jobTitle': 'Photographer',
            'url': 'https://next-portfolio-lime-one.vercel.app',
            'image': 'https://next-portfolio-lime-one.vercel.app/logo.png',
            'sameAs': [
                'https://instagram.com',
                'https://x.com'
            ],
            'description': 'Portrait & Snapshot Photographer based in Otaru, Hokkaido.'
        };
    } else if (type === 'WebSite') {
        schema = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': 'DAITAN Portfolio',
            'url': 'https://next-portfolio-lime-one.vercel.app',
            'potentialAction': {
                '@type': 'SearchAction',
                'target': 'https://next-portfolio-lime-one.vercel.app/search?q={search_term_string}',
                'query-input': 'required name=search_term_string'
            }
        };
    }

    const finalSchema = data ? { ...schema, ...data } : schema;

    return (
        <Script
            id={`json-ld-${type.toLowerCase()}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(finalSchema) }}
        />
    );
}
