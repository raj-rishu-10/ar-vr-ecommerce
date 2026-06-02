const fs = require('fs');
const path = require('path');

function readDirRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      readDirRecursively(filePath, fileList);
    } else if (filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsxFiles = readDirRecursively(path.join(__dirname, 'src'));
let cssRules = [];
let classCounter = 1;

for (const file of jsxFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // We need to parse tag by tag to handle merging.
  // But a simple regex for tags with style:
  const tagRegex = /<([a-zA-Z0-9_.-]+)(\s+[^>]*?style={{.*?}}[^>]*?)\/?>/gs;

  content = content.replace(tagRegex, (match, tagName, attrs) => {
    const styleRegex = /style={(\{.*?\})}/s;
    const styleMatch = attrs.match(styleRegex);
    if (!styleMatch) return match;

    const innerObject = styleMatch[1];
    
    // Skip complex dynamic styles for safety
    if (innerObject.includes('${') || innerObject.includes('?') || innerObject.includes('local.')) {
      return match;
    }

    let obj;
    try {
      obj = new Function('return ' + innerObject)();
    } catch (e) {
      return match;
    }

    const className = `extracted-ui-${classCounter++}`;
    let cssText = '';
    for (const key in obj) {
      const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      // Handle numeric values that should be px (basic approximation)
      let val = obj[key];
      if (typeof val === 'number' && !['opacity', 'zIndex', 'fontWeight', 'flex'].includes(key)) {
        val = `${val}px`;
      }
      cssText += `  ${kebabKey}: ${val};\n`;
    }
    cssRules.push(`.${className} {\n${cssText}}`);

    let newAttrs = attrs.replace(styleRegex, '');
    
    // Merge className
    if (newAttrs.includes('className="')) {
      newAttrs = newAttrs.replace(/className="/, `className="${className} `);
    } else if (newAttrs.includes('className={`')) {
      newAttrs = newAttrs.replace(/className={`/, `className={\`${className} `);
    } else if (newAttrs.includes("className={'")) {
      newAttrs = newAttrs.replace(/className={'/, `className={'${className} `);
    } else {
      newAttrs += ` className="${className}"`;
    }

    modified = true;
    return match.replace(attrs, newAttrs);
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

if (cssRules.length > 0) {
  fs.appendFileSync(path.join(__dirname, 'src/styles/index.css'), '\n/* Extracted Styles */\n' + cssRules.join('\n') + '\n');
  console.log(`Extracted ${cssRules.length} styles.`);
}
