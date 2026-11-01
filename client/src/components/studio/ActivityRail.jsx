import { Files, Search, Users, Bug, FlaskConical, Zap } from 'lucide-react';

export default function ActivityRail({
    showExplorer,
    setShowExplorer,
    activeRailTab,
    setActiveRailTab,
    setViewMode,
    setRightTab,
    onRun,
    participantCount,
}) {
    return (
        <aside className="activity-rail" aria-label="Workspace Activity Rail">
            <div className="rail-top">
                <button
                    type="button"
                    className={`rail-btn ${showExplorer && activeRailTab === 'explorer' ? 'active' : ''}`}
                    title="Explorer"
                    aria-label="Explorer"
                    onClick={() => {
                        if (activeRailTab === 'explorer') setShowExplorer((v) => !v);
                        else {
                            setActiveRailTab('explorer');
                            setShowExplorer(true);
                        }
                    }}
                >
                    <Files size={17} />
                </button>

                <button
                    type="button"
                    className={`rail-btn ${showExplorer && activeRailTab === 'search' ? 'active' : ''}`}
                    title="Search Files"
                    aria-label="Search Files"
                    onClick={() => {
                        setActiveRailTab('search');
                        setShowExplorer(true);
                    }}
                >
                    <Search size={17} />
                </button>

                <button
                    type="button"
                    className={`rail-btn ${showExplorer && activeRailTab === 'peers' ? 'active' : ''}`}
                    title="Collaborators"
                    aria-label="Collaborators"
                    onClick={() => {
                        setActiveRailTab('peers');
                        setShowExplorer(true);
                    }}
                >
                    <Users size={17} />
                </button>

                <button
                    type="button"
                    className="rail-btn"
                    title="Terminal Console"
                    aria-label="Terminal Console"
                    onClick={() => {
                        setViewMode('Split');
                        setRightTab('terminal');
                    }}
                >
                    <Bug size={17} />
                </button>

                <button
                    type="button"
                    className="rail-btn"
                    title="Custom Stdin Testcases"
                    aria-label="Custom Stdin Testcases"
                    onClick={() => {
                        setViewMode('Split');
                        setRightTab('stdin');
                    }}
                >
                    <FlaskConical size={17} />
                </button>

                <button
                    type="button"
                    className="rail-btn"
                    title="Quick Execute Active File"
                    aria-label="Quick Execute Active File"
                    onClick={onRun}
                >
                    <Zap size={17} />
                </button>
            </div>

            <div className="rail-bottom">
                <div className="peer-dot" title={`${participantCount} online`}>
                    {participantCount}
                </div>
            </div>
        </aside>
    );
}
