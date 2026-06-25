const fs = require('fs');

function fixFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(/: "\?\?\?장 \?황"/g, ': "농장 현황"');
  content = content.replace(/label: "\?태 미확\?\?,/g, 'label: "상태 미확인",');
  content = content.replace(/불러\?는 중\?\/div>/g, '불러오는 중...</div>');
  content = content.replace(/useState<Crop>\("\?\);/g, 'useState<Crop>("벼");');
  content = content.replace(/title="\?험 분석"/g, 'title="위험 분석"');
  
  fs.writeFileSync(path, content, 'utf8');
}

const files = [
  'src/routes/farmer.tsx',
  'src/routes/farms.$farmId.machines.tsx',
  'src/routes/reports.$reportId.tsx',
  'src/routes/farms.new.tsx',
  'src/routes/farms.$farmId.risk.tsx'
];

for (const file of files) {
  try {
    fixFile(file);
    console.log('Fixed', file);
  } catch (e) {
    console.error('Error fixing', file, e.message);
  }
}
