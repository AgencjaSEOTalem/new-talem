const BASE_URL = "https://www.talem.eu";

export function breadcrumb(name: string, path: string): Record<string, unknown>[] {
  return [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": name, "item": `${BASE_URL}${path}` },
      ],
    },
  ];
}
