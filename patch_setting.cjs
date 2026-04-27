const fs = require('fs');
const file = 'src/App.jsx';
let c = fs.readFileSync(file, 'utf8');

// Fix Setting nav item - add onClick
c = c.replace(
  '               <div className="nav-item">\n                  <span className="nav-icon">⚙️</span>\n                  <span className="nav-text">Setting</span>\n               </div>',
  '               <div className="nav-item" onClick={() => { setCurrentView(\'settings\'); setIsNavOpen(false); }} style={{ cursor: \'pointer\' }}>\n                  <span className="nav-icon">⚙️</span>\n                  <span className="nav-text">Setting</span>\n               </div>'
);

fs.writeFileSync(file, c);
console.log('Patched:', c.includes("setCurrentView('settings')"));
