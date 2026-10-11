'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import {
  filterResources,
  RESOURCE_CATEGORIES,
  TOOLKIT_RESOURCES,
  type ResourceCategory,
  type ToolkitTool,
} from '@/lib/toolkit-resources';

const TOOLS: ToolkitTool[] = ['Sizing Tool', 'Field Toolkit', 'WhatGas', 'Safety Center'];
const field = 'mt-1 h-11 w-full border border-gray-200 bg-white px-3 text-base text-gray-900 sm:text-sm';

export default function ResourcesPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ResourceCategory | 'all'>('all');
  const [tool, setTool] = useState<ToolkitTool | 'all'>('all');

  const visible = useMemo(() => filterResources(TOOLKIT_RESOURCES, { query, category, tool }), [query, category, tool]);
  const groups = RESOURCE_CATEGORIES.map((name) => ({ name, items: visible.filter((r) => r.category === name) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          The standards, handbooks and tools behind the Sizing Tool, Field Toolkit and WhatGas. Links open the publisher&apos;s own site, and some standards must be bought.
          Always check you are using the current edition.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-xs font-semibold text-gray-700">Search
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" className={`${field} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. ASHRAE, SANS, Copeland" />
          </span>
        </label>
        <label className="text-xs font-semibold text-gray-700">Topic
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory | 'all')}>
            <option value="all">All topics</option>
            {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-700">Used in
          <select className={field} value={tool} onChange={(e) => setTool(e.target.value as ToolkitTool | 'all')}>
            <option value="all">Every tool</option>
            {TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="border border-gray-200 bg-white p-6 text-sm text-gray-600">Nothing matches. Clear the search or choose another topic.</p>
      ) : (
        groups.map((group) => (
          <section key={group.name} aria-labelledby={`res-${group.name}`} className="space-y-3">
            <h2 id={`res-${group.name}`} className="text-sm font-bold uppercase tracking-wide text-gray-500">{group.name}</h2>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {group.items.map((r) => (
                <li key={r.id} className="flex flex-col justify-between gap-3 border border-gray-200 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-600">{r.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {r.usedIn.map((t) => (
                        <span key={t} className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t}</span>
                      ))}
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-blue-700 hover:text-blue-900 sm:min-h-0"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{r.name} (opens in a new tab)</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
