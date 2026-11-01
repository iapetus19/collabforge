import mongoose from 'mongoose';
import crypto from 'node:crypto';

const { Schema } = mongoose;

const fileNodeSchema = new Schema(
  {
    name: { type: String, required: true }, // Full relative path, e.g. "src/utils/heap.js"
    type: { type: String, enum: ['file', 'folder'], default: 'file' },
    content: { type: String, default: '' },
  },
  { _id: false }
);

const roomSchema = new Schema(
  {
    roomId: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(4).toString('hex'),
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
    },
    language: {
      type: String,
      enum: ['javascript', 'typescript', 'python', 'cpp', 'java', 'go', 'rust'],
      default: 'javascript',
    },
    code: {
      type: String,
      default: '',
    },
    files: {
      type: [fileNodeSchema],
      default: [
        { name: 'src', type: 'folder', content: '' },
        { name: 'src/utils', type: 'folder', content: '' },
        {
          name: 'src/main.js',
          type: 'file',
          content: `const { MinHeap, ListNode } = require('@collabforge/leetcode');\nconst { formatResult } = require('./utils/helper.js');\n\n// Demo: K-th Smallest Element using Built-in LeetCode MinHeap\nconst heap = new MinHeap();\n[15, 3, 9, 1, 22, 7].forEach((n) => heap.push(n));\n\nconst sorted = [];\nwhile (heap.size() > 0) {\n  sorted.push(heap.pop());\n}\n\nconsole.log(formatResult("Sorted via MinHeap", sorted));\n`,
        },
        {
          name: 'src/utils/helper.js',
          type: 'file',
          content: `function formatResult(label, data) {\n  return \`[\${label}] => \${JSON.stringify(data)}\`;\n}\n\nmodule.exports = { formatResult };\n`,
        },
        {
          name: 'README.md',
          type: 'file',
          content: `# CollabForge Workspace\n- Multi-file imports enabled\n- Built-in \`@collabforge/leetcode\` DSA package (MinHeap, MaxHeap, ListNode, TreeNode, UnionFind)\n`,
        },
      ],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
