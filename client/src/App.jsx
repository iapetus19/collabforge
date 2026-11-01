import { useState, useEffect, useRef, useMemo } from 'react';
import { apiRequest, getStoredUser, clearAuthSession } from './api';
import { LANGUAGES, getStarterFiles } from './constants/workspaceConfig';
import { inferLanguageFromFilename, buildFileTree } from './utils/fileTree';
import { useRoomSocket } from './hooks/useRoomSocket';

import AuthPortal from './components/auth/AuthPortal';
import DashboardView from './components/dashboard/DashboardView';
import AccessModals from './components/modals/AccessModals';
import StudioTopbar from './components/studio/StudioTopbar';
import ActivityRail from './components/studio/ActivityRail';
import ExplorerPanel from './components/studio/ExplorerPanel';
import EditorPanel from './components/studio/EditorPanel';
import TerminalPanel from './components/studio/TerminalPanel';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [rooms, setRooms] = useState([]);

  // Studio Workspace state
  const [activeRoom, setActiveRoom] = useState(null);
  const [files, setFiles] = useState(getStarterFiles('javascript'));
  const [activeFilePath, setActiveFilePath] = useState('src/index.js');
  const [openTabs, setOpenTabs] = useState(['src/components/TopBar.tsx', 'src/index.js']);
  const [expandedFolders, setExpandedFolders] = useState({
    public: true,
    src: true,
    'src/components': true,
  });

  // UI layout controls
  const [showExplorer, setShowExplorer] = useState(true);
  const [activeRailTab, setActiveRailTab] = useState('explorer');
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState('Split');

  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState([]);
  const [activityBanner, setActivityBanner] = useState('System ready.');
  const [saving, setSaving] = useState(false);

  // Host approval & Terminal state
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [joinDenied, setJoinDenied] = useState(false);
  const [rightTab, setRightTab] = useState('terminal');
  const [running, setRunning] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [execTime, setExecTime] = useState(null);

  const isRemoteUpdateRef = useRef(false);
  const saveTimerRef = useRef(null);

  const fileTree = useMemo(() => buildFileTree(files, searchFilter), [files, searchFilter]);
  const activeFileObj = useMemo(
    () =>
      files.find((f) => f.name === activeFilePath && f.type !== 'folder') ||
      files.find((f) => f.type !== 'folder'),
    [files, activeFilePath]
  );

  const editorMonacoLanguage = useMemo(() => {
    const inferred = inferLanguageFromFilename(activeFileObj?.name);
    if (inferred.monaco) return inferred.monaco;
    if (['java', 'cpp', 'python', 'go', 'rust'].includes(language)) return language;
    return language || 'javascript';
  }, [activeFileObj?.name, language]);

  const fetchRooms = async () => {
    try {
      const data = await apiRequest('/api/rooms');
      setRooms(data.rooms || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  const leaveRoomToDashboard = () => {
    if (user) localStorage.removeItem(`cf_active_room_${user.id || user._id}`);
    localStorage.removeItem('cf_active_room_id');
    window.history.replaceState({}, '', window.location.pathname);
    fetchRooms();
    setActiveRoom(null);
  };

  const handleLogout = () => {
    if (user) localStorage.removeItem(`cf_active_room_${user.id || user._id}`);
    localStorage.removeItem('cf_active_room_id');
    window.history.replaceState({}, '', window.location.pathname);
    clearAuthSession();
    setUser(null);
    setActiveRoom(null);
  };

  const socketRef = useRoomSocket({
    activeRoom,
    user,
    isRemoteUpdateRef,
    setFiles,
    setLanguage,
    setParticipants,
    setActivityBanner,
    setWaitingApproval,
    setIncomingRequest,
    setJoinDenied,
    leaveRoomToDashboard,
  });

  useEffect(() => {
    if (!user) return;
    fetchRooms();

    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId && !activeRoom) {
      apiRequest(`/api/rooms/${urlRoomId}`)
        .then((data) => {
          if (data?.room) enterRoom(data.room);
        })
        .catch(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, [user]);

  const enterRoom = (room) => {
    if (user) localStorage.setItem(`cf_active_room_${user.id || user._id}`, room.roomId);
    window.history.replaceState({}, '', `?room=${room.roomId}`);

    setActiveRoom(room);
    setJoinDenied(false);
    const roomLang = room.language || 'javascript';
    const initialFiles =
      room.files && room.files.length > 0
        ? room.files.map((f) => ({ ...f, type: f.type || 'file' }))
        : getStarterFiles(roomLang);

    setFiles(initialFiles);
    const codeFiles = initialFiles.filter((f) => f.type !== 'folder');
    const firstFile = codeFiles[codeFiles.length - 1]?.name || 'src/index.js';
    setActiveFilePath(firstFile);
    setOpenTabs(codeFiles.slice(0, 3).map((f) => f.name));

    const inferred = inferLanguageFromFilename(firstFile);
    setLanguage(inferred.runtime || roomLang);
    setTerminalLogs([
      {
        type: 'system',
        text: `CollabForge Studio — "${room.name}" (${room.roomId})\nRun shell commands below (npm init -y, npm i <pkg>, ls, mkdir, touch, clear) or click Run.`,
      },
    ]);
  };

  const persistRoomState = async (filesToSave = files, langToSave = language) => {
    if (!activeRoom) return;
    setSaving(true);
    try {
      const mainContent = filesToSave.find((f) => f.type !== 'folder')?.content || '';
      await apiRequest(`/api/rooms/${activeRoom.roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ code: mainContent, language: langToSave, files: filesToSave }),
      });
    } catch (err) {
      console.error('Auto-save failed:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const broadcastAndPersistFiles = (updatedFiles, langToSave = language) => {
    setFiles(updatedFiles);
    if (socketRef.current && activeRoom) {
      socketRef.current.emit('file-change', {
        roomId: activeRoom.roomId,
        files: updatedFiles,
      });
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistRoomState(updatedFiles, langToSave);
    }, 1200);
  };

  const selectFileAndSyncLanguage = (path) => {
    setActiveFilePath(path);
    if (!openTabs.includes(path)) setOpenTabs((prev) => [...prev, path]);
    const { runtime } = inferLanguageFromFilename(path);
    if (runtime && runtime !== language) {
      setLanguage(runtime);
      if (socketRef.current && activeRoom) {
        socketRef.current.emit('language-change', {
          roomId: activeRoom.roomId,
          language: runtime,
        });
      }
    }
  };

  const handleEditorChange = (value) => {
    if (!activeFileObj) return;
    const updatedFiles = files.map((f) =>
      f.name === activeFileObj.name ? { ...f, content: value ?? '' } : f
    );
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      setFiles(updatedFiles);
      return;
    }
    broadcastAndPersistFiles(updatedFiles, language);
  };

  const handleCreateNode = (parentPath, nodeType) => {
    const defaultExt = LANGUAGES.find((l) => l.id === language)?.ext || 'js';
    const label = nodeType === 'folder' ? 'folder name' : `file name (e.g. Main.${defaultExt})`;
    const prefix = parentPath ? `${parentPath}/` : '';
    const input = prompt(`Enter new ${label} inside "${parentPath || 'root'}":`);
    if (!input?.trim()) return;

    const cleanPath = `${prefix}${input.trim().replace(/^\/+|\/+$/g, '')}`;
    if (files.some((f) => f.name === cleanPath)) return alert('Path already exists.');

    const { runtime } = inferLanguageFromFilename(cleanPath);
    let starterContent = '';
    if (nodeType === 'file') {
      if (runtime === 'java') {
        const cls = cleanPath.split('/').pop().replace('.java', '') || 'Main';
        starterContent = `public class ${cls} {\n  public static void main(String[] args) {\n    System.out.println("Hello from ${cls}");\n  }\n}\n`;
      } else if (runtime === 'cpp') {
        starterContent = `#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello C++" << endl;\n  return 0;\n}\n`;
      } else if (runtime === 'python') {
        starterContent = `print("Hello Python")\n`;
      } else {
        starterContent = `// ${cleanPath}\n`;
      }
    }

    const updated = [...files, { name: cleanPath, type: nodeType, content: starterContent }];
    if (parentPath) setExpandedFolders((prev) => ({ ...prev, [parentPath]: true }));
    if (nodeType === 'file') selectFileAndSyncLanguage(cleanPath);
    broadcastAndPersistFiles(updated, runtime || language);
  };

  const handleDeleteNode = (targetPath, isFolder) => {
    if (!confirm(`Delete ${isFolder ? 'folder' : 'file'} "${targetPath}"?`)) return;
    const updated = files.filter((f) => f.name !== targetPath && !f.name.startsWith(`${targetPath}/`));
    setOpenTabs((prev) => prev.filter((t) => t !== targetPath && !t.startsWith(`${targetPath}/`)));
    if (activeFilePath === targetPath || activeFilePath.startsWith(`${targetPath}/`)) {
      const next = updated.find((f) => f.type !== 'folder');
      if (next) selectFileAndSyncLanguage(next.name);
    }
    broadcastAndPersistFiles(updated);
  };

  const handleRunCode = async () => {
    if (!activeFileObj || !activeRoom) return;
    setRunning(true);
    if (viewMode === 'Code') setViewMode('Split');
    setRightTab('terminal');

    const execLang = inferLanguageFromFilename(activeFileObj.name).runtime || language;
    setTerminalLogs((prev) => [
      ...prev,
      { type: 'cmd', text: `studio@workspace:~$ run ${activeFileObj.name}` },
    ]);

    try {
      const result = await apiRequest('/api/execute', {
        method: 'POST',
        body: JSON.stringify({
          roomId: activeRoom.roomId,
          code: activeFileObj.content,
          language: execLang,
          files,
          entryFile: activeFileObj.name,
          stdin: stdinInput,
        }),
      });
      setExecTime(result.executionTimeMs);
      if (result.updatedFiles?.length) broadcastAndPersistFiles(result.updatedFiles, execLang);
      setTerminalLogs((prev) => [
        ...prev,
        ...(result.output ? [{ type: 'stdout', text: result.output }] : []),
        ...(result.stderr ? [{ type: 'stderr', text: result.stderr }] : []),
        {
          type: 'meta',
          text: `[Exited with code ${result.exitCode ?? 0} • ${result.executionTimeMs}ms]`,
        },
      ]);
    } catch (err) {
      setTerminalLogs((prev) => [...prev, { type: 'stderr', text: err.message }]);
    } finally {
      setRunning(false);
    }
  };

  const handleTerminalCommandSubmit = async (e) => {
    e.preventDefault();
    const raw = terminalCommand.trim();
    if (!raw || !activeRoom) return;
    setTerminalCommand('');
    setTerminalLogs((prev) => [...prev, { type: 'cmd', text: `studio@workspace:~$ ${raw}` }]);

    if (raw === 'clear') return setTerminalLogs([]);
    try {
      const result = await apiRequest('/api/execute', {
        method: 'POST',
        body: JSON.stringify({
          roomId: activeRoom.roomId,
          files,
          language,
          command: raw,
          stdin: stdinInput,
        }),
      });
      setExecTime(result.executionTimeMs);
      if (result.updatedFiles?.length) broadcastAndPersistFiles(result.updatedFiles, language);
      setTerminalLogs((prev) => [
        ...prev,
        ...(result.output ? [{ type: 'stdout', text: result.output }] : []),
        ...(result.stderr ? [{ type: 'stderr', text: result.stderr }] : []),
      ]);
    } catch (err) {
      setTerminalLogs((prev) => [...prev, { type: 'stderr', text: err.message }]);
    }
  };

  if (!user) return <AuthPortal onAuthSuccess={setUser} />;

  if (!activeRoom) {
    return (
      <DashboardView
        user={user}
        rooms={rooms}
        onEnterRoom={enterRoom}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="studio-window">
      <AccessModals
        waitingApproval={waitingApproval}
        incomingRequest={incomingRequest}
        activeRoomName={activeRoom.name}
        onCancelWait={leaveRoomToDashboard}
        joinDenied={joinDenied}
        onDismissDenied={() => {
          setJoinDenied(false);
          leaveRoomToDashboard();
        }}
        onHostDecision={(approved) => {
          if (!incomingRequest) return;
          socketRef.current?.emit('host-decision', {
            guestSocketId: incomingRequest.guestSocketId,
            guestUserId: incomingRequest.guestUserId,
            approved,
            roomId: activeRoom.roomId,
          });
          setIncomingRequest(null);
        }}
      />

      <StudioTopbar
        user={user}
        activeRoom={activeRoom}
        viewMode={viewMode}
        setViewMode={setViewMode}
        language={language}
        onLanguageChange={(newLang) => {
          setLanguage(newLang);
          socketRef.current?.emit('language-change', {
            roomId: activeRoom.roomId,
            language: newLang,
          });
          persistRoomState(files, newLang);
        }}
        onLeaveRoom={leaveRoomToDashboard}
        onSave={() => persistRoomState()}
        saving={saving}
        onRun={handleRunCode}
        running={running}
        participants={participants}
      />

      <div className="studio-body">
        <ActivityRail
          showExplorer={showExplorer}
          setShowExplorer={setShowExplorer}
          activeRailTab={activeRailTab}
          setActiveRailTab={setActiveRailTab}
          setViewMode={setViewMode}
          setRightTab={setRightTab}
          onRun={handleRunCode}
          participantCount={participants.length}
        />

        {showExplorer && (
          <ExplorerPanel
            activeRailTab={activeRailTab}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            participants={participants}
            currentUserId={user.id || user._id}
            fileTree={fileTree}
            activeFilePath={activeFileObj?.name}
            expandedFolders={expandedFolders}
            onToggleFolder={(p) =>
              setExpandedFolders((prev) => ({ ...prev, [p]: !(prev[p] ?? true) }))
            }
            onSelectFile={selectFileAndSyncLanguage}
            onCreateNode={handleCreateNode}
            onDeleteNode={handleDeleteNode}
            onResetStarterTree={() => {
              const starter = getStarterFiles(language);
              broadcastAndPersistFiles(starter, language);
              const first = starter.find((f) => f.type !== 'folder')?.name;
              if (first) {
                setActiveFilePath(first);
                setOpenTabs([first]);
              }
            }}
            onCollapse={() => setShowExplorer(false)}
          />
        )}

        {viewMode !== 'Terminal' && (
          <EditorPanel
            openTabs={openTabs}
            activeFileObj={activeFileObj}
            editorMonacoLanguage={editorMonacoLanguage}
            onSelectTab={selectFileAndSyncLanguage}
            onCloseTab={(e, path) => {
              e.stopPropagation();
              const filtered = openTabs.filter((t) => t !== path);
              setOpenTabs(filtered);
              if (activeFilePath === path && filtered.length > 0) {
                selectFileAndSyncLanguage(filtered[filtered.length - 1]);
              }
            }}
            onEditorChange={handleEditorChange}
            running={running}
            activityBanner={activityBanner}
          />
        )}

        {viewMode !== 'Code' && (
          <TerminalPanel
            viewMode={viewMode}
            rightTab={rightTab}
            setRightTab={setRightTab}
            execTime={execTime}
            terminalLogs={terminalLogs}
            terminalCommand={terminalCommand}
            setTerminalCommand={setTerminalCommand}
            onCommandSubmit={handleTerminalCommandSubmit}
            stdinInput={stdinInput}
            setStdinInput={setStdinInput}
          />
        )}
      </div>
    </div>
  );
}
