import {
    ChevronDown,
    ChevronRight,
    FolderOpen,
    Folder,
    FilePlus,
    FolderPlus,
    Trash2,
    RotateCcw,
    PanelLeft,
} from 'lucide-react';
import { FileTypeIcon } from '../../utils/fileTree';

function TreeNodeItem({
    node,
    depth,
    activeFilePath,
    expandedFolders,
    onToggleFolder,
    onSelectFile,
    onCreateNode,
    onDeleteNode,
}) {
    const entries = Object.values(node.children).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <>
            {entries.map((child) => {
                const isFolder = child.type === 'folder';
                const isExpanded = expandedFolders[child.path] ?? true;
                const isActive = !isFolder && activeFilePath === child.path;

                return (
                    <div key={child.path}>
                        <div
                            className={`tree-row ${isActive ? 'active' : ''}`}
                            style={{ paddingLeft: `${8 + depth * 16}px` }}
                            onClick={() => (isFolder ? onToggleFolder(child.path) : onSelectFile(child.path))}
                        >
                            <div className="tree-left">
                                {isFolder ? (
                                    <>
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
                                    </>
                                ) : (
                                    <span style={{ marginLeft: 'var(--s-4)', display: 'inline-flex', alignItems: 'center' }}>
                                        <FileTypeIcon filename={child.name} />
                                    </span>
                                )}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {child.name}
                                </span>
                            </div>

                            <div className="tree-right" onClick={(e) => e.stopPropagation()}>
                                {!isFolder && child.lineCount > 0 && (
                                    <span className="diff-stat">+{child.lineCount}</span>
                                )}
                                <div className="tree-actions">
                                    {isFolder && (
                                        <>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                title="New File in Folder"
                                                aria-label={`New file in ${child.name}`}
                                                onClick={() => onCreateNode(child.path, 'file')}
                                            >
                                                <FilePlus size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                title="New Subfolder"
                                                aria-label={`New subfolder in ${child.name}`}
                                                onClick={() => onCreateNode(child.path, 'folder')}
                                            >
                                                <FolderPlus size={12} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        title="Delete"
                                        aria-label={`Delete ${child.name}`}
                                        onClick={() => onDeleteNode(child.path, isFolder)}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isFolder && isExpanded && (
                            <TreeNodeItem
                                node={child}
                                depth={depth + 1}
                                activeFilePath={activeFilePath}
                                expandedFolders={expandedFolders}
                                onToggleFolder={onToggleFolder}
                                onSelectFile={onSelectFile}
                                onCreateNode={onCreateNode}
                                onDeleteNode={onDeleteNode}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
}

export default function ExplorerPanel({
    activeRailTab,
    searchFilter,
    setSearchFilter,
    participants,
    currentUserId,
    fileTree,
    activeFilePath,
    expandedFolders,
    onToggleFolder,
    onSelectFile,
    onCreateNode,
    onDeleteNode,
    onResetStarterTree,
    onCollapse,
}) {
    return (
        <aside className="explorer-panel" aria-label="Workspace Explorer">
            <div className="explorer-header">
                <span className="explorer-title">
                    {activeRailTab === 'search'
                        ? 'Search'
                        : activeRailTab === 'peers'
                            ? 'Collaborators'
                            : 'Explorer'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-1)' }}>
                    {activeRailTab === 'explorer' && (
                        <>
                            <button
                                type="button"
                                className="icon-btn"
                                title="New File"
                                aria-label="New File"
                                onClick={() => onCreateNode('', 'file')}
                            >
                                <FilePlus size={14} />
                            </button>
                            <button
                                type="button"
                                className="icon-btn"
                                title="New Folder"
                                aria-label="New Folder"
                                onClick={() => onCreateNode('', 'folder')}
                            >
                                <FolderPlus size={14} />
                            </button>
                            <button
                                type="button"
                                className="icon-btn"
                                title="Reset Starter Tree"
                                aria-label="Reset Starter Tree"
                                onClick={onResetStarterTree}
                            >
                                <RotateCcw size={13} />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className="icon-btn"
                        title="Collapse Panel"
                        aria-label="Collapse Explorer Panel"
                        onClick={onCollapse}
                    >
                        <PanelLeft size={14} />
                    </button>
                </div>
            </div>

            {activeRailTab === 'search' && (
                <div style={{ padding: 'var(--s-2)', borderBottom: 'var(--border)', background: 'var(--surface)' }}>
                    <input
                        className="input"
                        aria-label="Filter files by name"
                        placeholder="Filter files by name..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            {activeRailTab === 'peers' ? (
                <div className="tree-scroll">
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--s-2)' }}>
                        Connected in real-time ({participants.length})
                    </div>
                    {participants.map((p) => (
                        <div key={p.socketId} className="peer-chip">
                            <div className="peer-dot">
                                {p.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <div>
                                    {p.username} {String(p.id) === String(currentUserId) ? '(You)' : ''}
                                </div>
                                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>
                                    Connected • Live Sync
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="tree-scroll">
                    <TreeNodeItem
                        node={fileTree}
                        depth={0}
                        activeFilePath={activeFilePath}
                        expandedFolders={expandedFolders}
                        onToggleFolder={onToggleFolder}
                        onSelectFile={onSelectFile}
                        onCreateNode={onCreateNode}
                        onDeleteNode={onDeleteNode}
                    />
                </div>
            )}
        </aside>
    );
}
