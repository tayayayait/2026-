const fs = require('fs');

function fixFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(/subtitle=\{farms\?\.\[0\] \? `\$\{farms\[0\]\.name\} · \$\{farms\[0\]\.region\}` : "\?\?\?장 \?황"\}/g, 'subtitle={farms?.[0] ? `${farms[0].name} · ${farms[0].region}` : "농장 현황"}');
  content = content.replace(/title: "\?업기상 \?이\?\?\?\?\? 지\?\?,/g, 'title: "농업기상 이상 지수",');
  content = content.replace(/useState<Crop>\("\?\);/g, 'useState<Crop>("벼");');
  content = content.replace(/className="text-xs text-primary font-semibold">\?\?\?\?보\?\?\/Link>/g, 'className="text-xs text-primary font-semibold">농기계 현황</Link>');
  content = content.replace(/subtitle="지\?\? \?험\?\?\?비 \?요 모니\?링"/g, 'subtitle="지역별 위험 및 장비 필요 모니터링"');
  
  fs.writeFileSync(path, content, 'utf8');
}

const files = [
  'src/routes/farmer.tsx',
  'src/routes/alerts.tsx',
  'src/routes/farms.new.tsx',
  'src/routes/admin.rentals.tsx',
  'src/routes/admin.tsx'
];

for (const file of files) {
  try {
    fixFile(file);
    console.log('Fixed', file);
  } catch (e) {
    console.error('Error fixing', file, e.message);
  }
}
