import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { X, Sparkles } from 'lucide-react';
import { FileTypeIcon } from '../../utils/fileTree';

export default function EditorPanel({
    openTabs,
    activeFileObj,
    editorMonacoLanguage,
    onSelectTab,
    onCloseTab,
    onEditorChange,
    running,
    activityBanner,
}) {
    const monacoRef = useRef(null);

    const applyWarmCreamTheme = (monaco) => {
        monaco.editor.defineTheme('collabforge-cream', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '9E3B24', fontStyle: 'bold' },
                { token: 'type', foreground: '23646E', fontStyle: 'bold' },
                { token: 'type.identifier', foreground: '23646E', fontStyle: 'bold' },
                { token: 'identifier', foreground: '3A2E2A' },
                { token: 'string', foreground: '4E6B26' },
                { token: 'number', foreground: '633A7A', fontStyle: 'bold' },
                { token: 'comment', foreground: '756256', fontStyle: 'italic' },
                { token: 'delimiter', foreground: '3A2E2A' },
            ],
            colors: {
                'editor.background': '#FFFDF4',
                'editor.foreground': '#3A2E2A',
                'editorLineNumber.foreground': '#66564C',
                'editorLineNumber.activeForeground': '#3A2E2A',
                'editor.lineHighlightBackground': '#FFE3B359',
                'editor.selectionBackground': '#A3C4BC59',
                'editorCursor.foreground': '#3A2E2A',
                'editorIndentGuide.background': '#EAD7D1',
                'editorWidget.background': '#FFFDF4',
                'editorWidget.border': '#3A2E2A',
            },
        });
        monaco.editor.setTheme('collabforge-cream');
    };

    const handleEditorWillMount = (monaco) => {
        monacoRef.current = monaco;
        applyWarmCreamTheme(monaco);

        const compilerOpts = {
            target: monaco.languages.typescript.ScriptTarget.Latest,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
            reactNamespace: 'React',
            allowJs: true,
        };
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOpts);
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOpts);

        const isJsOrTs = ['javascript', 'typescript'].includes(editorMonacoLanguage);
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: !isJsOrTs,
        });
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: !isJsOrTs,
        });
    };

    const handleEditorDidMount = (_, monaco) => {
        monacoRef.current = monaco;
        applyWarmCreamTheme(monaco);
    };

    useEffect(() => {
        if (!monacoRef.current) return;
        const isJsOrTs = ['javascript', 'typescript'].includes(editorMonacoLanguage);
        monacoRef.current.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: !isJsOrTs,
        });
        monacoRef.current.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: !isJsOrTs,
        });
    }, [editorMonacoLanguage]);

    return (
        <section className="editor-card" aria-label="Code Editor Window">
            <div className="pill-tabs-bar">
                <div className="pill-tabs-list" role="tablist">
                    {openTabs.map((tabPath) => {
                        const fileName = tabPath.split('/').pop();
                        const isTabActive = activeFileObj?.name === tabPath;
                        return (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={isTabActive}
                                key={tabPath}
                                className={`pill-tab ${isTabActive ? 'active' : ''}`}
                                onClick={() => onSelectTab(tabPath)}
                            >
                                <FileTypeIcon filename={fileName} />
                                <span>{fileName}</span>
                                {openTabs.length > 1 ? (
                                    <span
                                        onClick={(e) => onCloseTab(e, tabPath)}
                                        aria-label={`Close ${fileName}`}
                                        style={{ display: 'inline-flex', alignItems: 'center' }}
                                    >
                                        <X size={12} />
                                    </span>
                                ) : (
                                    <span className="tab-dot" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <span className="badge">{activeFileObj?.name}</span>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    theme="collabforge-cream"
                    language={editorMonacoLanguage}
                    value={activeFileObj?.content || ''}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    onChange={onEditorChange}
                    options={{
                        fontSize: 14,
                        lineHeight: 24,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        tabSize: 2,
                        renderLineHighlight: 'all',
                    }}
                />
            </div>

            <div className="editor-footer-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                    <Sparkles size={14} />
                    <span>{running ? 'Executing in sandbox...' : activityBanner}</span>
                </div>
                <span>UTF-8 • {editorMonacoLanguage.toUpperCase()}</span>
            </div>
        </section>
    );
}
