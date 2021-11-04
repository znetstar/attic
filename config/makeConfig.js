
const cfg = require(
  require('path').join(__dirname, 'config.js')
);

require('fs').writeFileSync(
  require('path').join(__dirname, 'config.json'),
  JSON.stringify(cfg, null, 2)
);
