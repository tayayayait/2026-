const fs = require('fs');

function fixFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Fix literal `n in imports
  content = content.replace(/`n/g, '\n');
  
  // Fix unterminated strings caused by ? replacing Korean chars
  content = content.replace(/"\?\?\?장 \?황"/g, '"농장 현황"');
  content = content.replace(/title="AI 리포\?\?>/g, 'title="AI 리포트">');
  content = content.replace(/unit="\?\?"/g, 'unit="개"');
  
  // Fix status map in admin.rentals.tsx
  content = content.replace(/label: "부\? \},/g, 'label: "부족" },');
  content = content.replace(/label: "미확\?\?,/g, 'label: "미확인" },');
  content = content.replace(/label: "\?유"/g, 'label: "보유"');
  content = content.replace(/label: "\?청"/g, 'label: "요청"');
  content = content.replace(/label: "\?음"/g, 'label: "없음"');
  
  // Fix unclosed quotes in forms
  content = content.replace(/setCrop\(".*?\);/g, 'setCrop("");');
  content = content.replace(/setStage\(".*?\);/g, 'setStage("");');
  content = content.replace(/placeholder="\?\? \?\? \?\?/g, 'placeholder="주소 입력"');
  content = content.replace(/<AppShell title="\?\? \?\?" subtitle="\?\? м\?\?\?\?\?\?ּ \?\?\?\?\?\?\?\?\?\?>/g, '<AppShell title="농장 등록" subtitle="주소를 입력해주세요">');
  content = content.replace(/placeholder="\?\?\n\?\?"/g, 'placeholder="농장명"');

  // Any stray '?' in className or text that might break JSX? Just let it be unless it breaks compilation.
  // We'll write it back with proper UTF-8
  fs.writeFileSync(path, content, 'utf8');
}

const files = [
  'src/routes/admin.rentals.tsx',
  'src/routes/admin.tsx',
  'src/routes/alerts.tsx',
  'src/routes/farmer.tsx',
  'src/routes/farms.$farmId.machines.tsx',
  'src/routes/farms.$farmId.risk.tsx',
  'src/routes/farms.new.tsx',
  'src/routes/reports.$reportId.tsx',
  'src/routes/index.tsx'
];

for (const file of files) {
  try {
    fixFile(file);
    console.log('Fixed', file);
  } catch (e) {
    console.error('Error fixing', file, e.message);
  }
}
