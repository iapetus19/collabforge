export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node.js)', ext: 'js' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'python', label: 'Python 3', ext: 'py' },
  { id: 'cpp', label: 'C++ 17 (GCC)', ext: 'cpp' },
  { id: 'java', label: 'Java (OpenJDK)', ext: 'java' },
];

export const getStarterFiles = (lang = 'javascript') => {
  if (lang === 'java') {
    return [
      { name: 'src', type: 'folder', content: '' },
      {
        name: 'src/Main.java',
        type: 'file',
        content: `public class Main {\n  public static void main(String[] args) {\n    List<Integer> nums = Arrays.asList(10, 20, 30, 40);\n    System.out.println("Sum: " + nums.stream().mapToInt(Integer::intValue).sum());\n  }\n}\n`,
      },
    ];
  }
  if (lang === 'cpp') {
    return [
      { name: 'src', type: 'folder', content: '' },
      {
        name: 'src/main.cpp',
        type: 'file',
        content: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  vector<int> v = {1, 2, 3, 4, 5};\n  cout << "Vector size: " << v.size() << endl;\n  return 0;\n}\n`,
      },
    ];
  }
  if (lang === 'python') {
    return [
      { name: 'src', type: 'folder', content: '' },
      {
        name: 'src/main.py',
        type: 'file',
        content: `def solve():\n    nums = [12, 24, 36]\n    print("Total:", sum(nums))\n\nif __name__ == "__main__":\n    solve()\n`,
      },
    ];
  }
  return [
    { name: 'public', type: 'folder', content: '' },
    { name: 'public/favicon.ico', type: 'file', content: '// Static icon asset\n' },
    { name: 'src', type: 'folder', content: '' },
    { name: 'src/components', type: 'folder', content: '' },
    {
      name: 'src/components/TopBar.tsx',
      type: 'file',
      content: `import React, { useState } from "react";\n\ntype ViewMode = "code" | "design" | "preview";\n\nexport const ProductDevWorkspace: React.FC = () => {\n  const [view, setView] = useState<ViewMode>("code");\n  return null;\n};\n`,
    },
    {
      name: 'src/components/header.tsx',
      type: 'file',
      content: `export function renderHeader(title) {\n  return \`<header>\${title}</header>\`;\n}\n`,
    },
    {
      name: 'src/index.js',
      type: 'file',
      content: `const os = require('os');\n\nfunction bootWorkspace() {\n  console.log("CollabForge Studio Active on:", os.platform());\n  console.log("Ready for multi-file execution & npm packages.");\n}\n\nbootWorkspace();\n`,
    },
  ];
};
