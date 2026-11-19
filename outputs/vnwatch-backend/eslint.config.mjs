/**
 * HỌC VNWATCH — outputs/vnwatch-backend/eslint.config.mjs
 * Cấu hình quy tắc kiểm tra mã TypeScript của backend; tách file sinh tự động và mã ứng dụng.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: [
      'dist/**',
      '.test-build/**',
      'src/generated/**',
      'node_modules/**',
      'vendor/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
);
