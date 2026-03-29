const fs = require('fs');
const path = require('path');

function getAllFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllFiles(path.join(__dirname, 'src'));

function resolveImportPath(currentFilePath, importStr) {
  if (!importStr.startsWith('.')) return importStr;
  if (importStr.endsWith('.js')) return importStr;

  const resolvedLocal = path.resolve(path.dirname(currentFilePath), importStr);
  if (fs.existsSync(resolvedLocal + '.js')) {
    return importStr + '.js';
  } else if (fs.existsSync(path.join(resolvedLocal, 'index.js'))) {
    return importStr + '/index.js';
  }
  return importStr + '.js'; 
}

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let isController = file.endsWith('.controller.js');

  // Handle require('dotenv').config()
  content = content.replace(/require\(['"]dotenv['"]\)\.config\(\);?/g, "import dotenv from 'dotenv';\ndotenv.config();");
  
  // 1. Process Requires
  // Handle destructured
  content = content.replace(/const\s+\{\s*([^}]+)\s*\}\s*=\s*require\((['"])(.*?)\2\);?/g, (match, destructured, quote, importPath) => {
    let resolvedPath = resolveImportPath(file, importPath);
    return `import { ${destructured.trim()} } from '${resolvedPath}';`;
  });
  
  // Handle default
  content = content.replace(/const\s+([A-Za-z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, (match, name, quote, importPath) => {
    let resolvedPath = resolveImportPath(file, importPath);
    // Move to top level if it's indented (like inside a function)
    return `import ${name} from '${resolvedPath}';`;
  });

  // Handle naked
  content = content.replace(/require\((['"])(.*?)\1\);?/g, (match, quote, importPath) => {
    let resolvedPath = resolveImportPath(file, importPath);
    return `import '${resolvedPath}';`;
  });
  
  // 2. module.exports -> export default
  content = content.replace(/module\.exports\s*=\s*/g, 'export default ');

  // 3. exports.xxx
  if (isController) {
    let hasExports = false;
    content = content.replace(/^exports\.([A-Za-z0-9_]+)\s*=\s*/gm, (m, p1) => {
      hasExports = true;
      return `  ${p1} = `;
    });

    if (hasExports) {
        const baseName = path.basename(file, '.controller.js');
        const className = baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Controller';

        let lastImportIndex = 0;
        const importRegex = /^import .+?;?/gm;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          lastImportIndex = match.index + match[0].length;
        }

        const beforeClass = content.substring(0, lastImportIndex).trim();
        const afterClass = content.substring(lastImportIndex).trim();
        
        content = `${beforeClass}\n\nclass ${className} {\n${afterClass}\n}\n\nexport default new ${className}();\n`;
    }
  } else {
    content = content.replace(/^exports\.([A-Za-z0-9_]+)\s*=\s*/gm, 'export const $1 = ');
  }
  
  // Fix imports that ended up with spaces
  content = content.replace(/import \{(.*?)\} from/g, (m, p1) => `import { ${p1.trim().replace(/\s*,\s*/g, ', ')} } from`);

  // Move all imports to top (important for things like upload.service.js inner imports)
  const imports = [];
  content = content.replace(/^\s*import .+?;/gm, (m) => {
    imports.push(m.trim());
    return '';
  });
  if (imports.length > 0) {
    // Unique imports
    const uniqueImports = [...new Set(imports)];
    content = uniqueImports.join('\n') + '\n' + content.trimStart();
  }

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Migration complete');
