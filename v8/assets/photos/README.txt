사진 넣는 방법 (코드 수정 불필요)

1) 사진 파일을 이 폴더(assets/photos/)에 넣으세요.
2) manifest.json 에 파일명을 적으세요. 목록이 비어 있으면 섹션이 숨겨지고 사진 파일도 요청하지 않습니다.

[갤러리 — "함께한 순간들"]
  "gallery": ["01.jpg", "02.jpg", "03.jpg"]
  - 목록 순서대로 보이고, 첫 번째 사진은 크게 보여요. 장수 제한 없음.
  - 설명(alt)을 넣으려면: { "file": "01.jpg", "alt": "첫 목욕" }

[성장 기록 — "이한이의 1년"]
  "timeline": ["m1.jpg", "m2.jpg", "m3.jpg", "m4.jpg"]
  - m1=태어난 날, m2=100일, m3=첫 걸음, m4=첫 돌 (문구는 assets/app.js 의 MILESTONES 기준)
  - 직접 정하려면: { "file": "m5.jpg", "en": "Trip", "label": "첫 여행", "date": "2026. 08. 01", "note": "제주에서" }

예시 manifest.json
  { "gallery": ["01.jpg", "02.jpg"], "timeline": ["m1.jpg", "m4.jpg"] }

※ http(s)로 열 때만 manifest.json 을 읽습니다 (파일을 더블클릭해서 file:// 로 열면 사진 섹션은 숨겨져요).
권장: 가로 1200~1600px, JPG, 파일당 300KB 이하.
