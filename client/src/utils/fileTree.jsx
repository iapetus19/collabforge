import { Atom } from 'lucide-react';

export function inferLanguageFromFilename(filename = '') {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.java')) return { monaco: 'java', runtime: 'java' };
    if (lower.endsWith('.py')) return { monaco: 'python', runtime: 'python' };
    if (['.cpp', '.cc', '.c', '.h', '.hpp'].some((ext) => lower.endsWith(ext))) {
        return { monaco: 'cpp', runtime: 'cpp' };
    }
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
        return { monaco: 'typescript', runtime: 'javascript' };
    }
    if (['.js', '.jsx', '.mjs', '.cjs'].some((ext) => lower.endsWith(ext))) {
        return { monaco: 'javascript', runtime: 'javascript' };
    }
    if (lower.endsWith('.go')) return { monaco: 'go', runtime: 'go' };
    if (lower.endsWith('.rs')) return { monaco: 'rust', runtime: 'rust' };
    if (lower.endsWith('.json')) return { monaco: 'json', runtime: null };
    if (lower.endsWith('.md')) return { monaco: 'markdown', runtime: null };
    if (lower.endsWith('.html')) return { monaco: 'html', runtime: null };
    if (lower.endsWith('.css')) return { monaco: 'css', runtime: null };
    return { monaco: null, runtime: null };
}

export function FileTypeIcon({ filename = '' }) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) {
        return (
            <span className="lang-badge lang-ts">
                <Atom size={12} />
            </span>
        );
    }
    if (lower.endsWith('.js') || lower.endsWith('.cjs') || lower.endsWith('.mjs')) {
        return <span className="lang-badge lang-js">JS</span>;
    }
    if (lower.endsWith('.ts')) return <span className="lang-badge lang-ts">TS</span>;
    if (lower.endsWith('.py')) return <span className="lang-badge lang-py">PY</span>;
    if (lower.endsWith('.java')) return <span className="lang-badge lang-java">JV</span>;
    if (['.cpp', '.cc', '.h'].some((ext) => lower.endsWith(ext))) {
        return <span className="lang-badge lang-cpp">C+</span>;
    }
    return <span className="lang-badge lang-md">✦</span>;
}

export function buildFileTree(files, searchQuery = '') {
    const root = { name: '', path: '', type: 'folder', children: {} };
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));

    for (const item of sorted) {
        if (
            searchQuery.trim() &&
            item.type !== 'folder' &&
            !item.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
            continue;
        }

        const parts = item.name.split('/').filter(Boolean);
        let current = root;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isLast = i === parts.length - 1;

            if (!current.children[part]) {
                const lineCount =
                    isLast && item.type !== 'folder'
                        ? Math.max(1, (item.content || '').split('\n').length)
                        : 0;
                current.children[part] = {
                    name: part,
                    path: currentPath,
                    type: isLast ? item.type || 'file' : 'folder',
                    lineCount,
                    children: {},
                };
            }
            current = current.children[part];
        }
    }
    return root;
}
