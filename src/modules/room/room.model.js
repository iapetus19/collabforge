import mongoose from 'mongoose';
import crypto from 'node:crypto';

const { Schema } = mongoose;

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
      default: '// Welcome to CollabForge\n// Start typing to collaborate in real-time...\n\nfunction solve() {\n  console.log("Hello, CollabForge!");\n}\n\nsolve();\n',
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
