const fs = require('fs');
let css = fs.readFileSync('src/app/globals.css', 'utf8');

const mobileCSSPatch = `
  /* Fix scroll on mobile */
  .cw-video-col {
    gap: 8px;
    height: 100%;
    max-height: 100%;
    flex: 1;
    overflow: hidden;
  }
`;

css = css.replace(/\.cw-video-col \{\s*gap: 8px;\s*\}/, mobileCSSPatch);
fs.writeFileSync('src/app/globals.css', css);
