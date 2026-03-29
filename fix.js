import fs from 'fs';
import path from 'path';

function getAllFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (fullPath.endsWith('.controller.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllFiles(path.join(process.cwd(), 'src'));

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Strip bad class wrappers
  content = content.replace(/class [A-Za-z]+Controller \{/g, '');
  content = content.replace(/export default new [A-Za-z]+Controller\(\);/g, '');
  
  // Fix broken asyncWrapper import
  content = content.replace(/import a\s*syncWrapper from/g, 'import asyncWrapper from');
  
  // Any stray 'import a':
  content = content.replace(/import a\s*$/gm, '');
  content = content.replace(/^syncWrapper from (.*?)$/gm, 'import asyncWrapper from $1');

  // Fix Mongoose Paginate imports if any
  content = content.replace(/import m\s*ongoosePaginate from/g, 'import mongoosePaginate from');

  // Find the exact line where the first method assigns
  let firstMethodMatch = content.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*(asyncWrapper|async|\()/m);
  
  if (firstMethodMatch) {
      let firstMethodIndex = firstMethodMatch.index;
      let beforeClass = content.substring(0, firstMethodIndex).trim();
      let afterClass = content.substring(firstMethodIndex).trim();
      
      const baseName = path.basename(file, '.controller.js');
      const className = baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Controller';
      
      content = `${beforeClass}\n\nclass ${className} {\n${afterClass}\n}\n\nexport default new ${className}();\n`;
  }
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed controllers');
