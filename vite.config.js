import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base:process.env.VITE_BASE_PATH||'/',
  plugins:[react()],
  build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'three',test:/node_modules\/three\/build/}]}}}},
});
