const fs = require('fs');

// Fix ProviderProfilePage.tsx
let providerCode = fs.readFileSync('src/pages/ProviderProfilePage.tsx', 'utf8');
// Remove arbitrary timing hack
providerCode = providerCode.replace(
  /const timeout = setTimeout\(\(\) => \{\n\s*const el = document.getElementById\("services-section"\);\n\s*if \(el\) \{\n\s*el.scrollIntoView\(\{ behavior: "smooth" \}\);\n\s*setScrollPending\(false\);\n\s*\}\n\s*\}, 50\);\n\s*return \(\) => clearTimeout\(timeout\);/g,
  \// Use requestAnimationFrame for render-aware scroll without arbitrary timing hacks
      requestAnimationFrame(() => {
        const el = document.getElementById("services-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          setScrollPending(false);
        }
      });\
);
// Fix any in ProviderProfilePage.tsx for new review policy
providerCode = providerCode.replace(/const eligibleBks = completedBks\.filter\(b => \{/g, 'const eligibleBks = completedBks.filter((b: any) => {');

fs.writeFileSync('src/pages/ProviderProfilePage.tsx', providerCode);

// Fix SearchPage.tsx
let searchCode = fs.readFileSync('src/pages/SearchPage.tsx', 'utf8');
searchCode = searchCode.replace(/const getServiceDesc = \(svc: any\): string => \{/g, 'const getServiceDesc = (svc: { description?: string | { description?: string } }): string => {');
fs.writeFileSync('src/pages/SearchPage.tsx', searchCode);

console.log('Fixed Customer app');
