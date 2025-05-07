/* ===== 공공데이터포털 키 & URL ===== */
const DATA_KEY = "HgzvYuKdNpoFiw5vdD6y06tR2gI5TNW5J8u1Ktjvb58HLnvkDwW7iW6e0YUYR0IIR%2FpVEKsbKSWduyM%2B49g%3D%3D";
const ENDPOINT = "https://api.odcloud.kr/api/15021138/v1/centers";
const QUERY    = `?serviceKey=${DATA_KEY}&page=1&perPage=1000&type=json`;
const TARGET   = ENDPOINT + QUERY;

/* --- CORS 프록시 선택지 --- */
const CORS_URL =
  // 1순위: AllOrigins (권장)
  `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET)}`;

/* ===== 전역 ===== */
let centers = [];
let map, marker, geocoder;

/* ===== 초기 ===== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCenters();
  buildSelect();
  initMap();
  document.getElementById("provinceSelect").addEventListener("change", renderByProvince);
  renderByProvince();
});

/* 1. 데이터 로딩 */
async function loadCenters() {
  try {
    const res = await fetch(CORS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    centers = json.data || json.items || json.response?.body?.items?.item || [];
  } catch (err) {
    console.error("[치매센터] 호출 실패:", err);
    alert("치매센터 데이터를 불러오지 못했습니다. (console 확인)");
  }
}

/* 2. 시·도 드롭다운 */
function buildSelect() {
  const provinces = [...new Set(
    centers.map(c => (c.address || c.소재지도로명주소 || "").split(" ")[0])
  )].sort();

  const sel = document.getElementById("provinceSelect");
  provinces.forEach(p => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = p;
    sel.appendChild(opt);
  });
}

/* 3. Kakao 지도 */
function initMap() {
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(36.5, 127.5),
    level : 12
  });
  marker = new kakao.maps.Marker({
    map,
    image: new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
      new kakao.maps.Size(24, 35)
    )
  });
  geocoder = new kakao.maps.services.Geocoder();
}

/* 4. 지역 필터 & 렌더 */
function renderByProvince() {
  const province = document.getElementById("provinceSelect").value;
  const listData = centers.filter(c =>
    (c.address || c.소재지도로명주소 || "").startsWith(province)
  );
  renderList(listData);
  if (listData.length) moveToCenter(listData[0]);
}

function renderList(items) {
  const wrap = document.getElementById("list");
  wrap.innerHTML = "";
  items.forEach(c => {
    const name = c.centerName || c.치매안심센터명 || "치매안심센터";
    const addr = c.address    || c.소재지도로명주소 || c.소재지지번주소 || "-";
    const tel  = c.phone      || c.관리기관전화번호   || "-";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h4>${name}</h4>
      <div>${addr}</div>
      <div class="phone"><span class="icon">☎</span>${tel}</div>
    `;
    card.onclick = () => moveToCenter(c);
    wrap.appendChild(card);
  });
}

/* 지도 포커스 */
function moveToCenter(c) {
  const lat = parseFloat(c.lat || c.latitude  || c.위도);
  const lng = parseFloat(c.lng || c.longitude || c.경도);
  if (!isNaN(lat) && !isNaN(lng)) {
    setMarker(lat, lng);
  } else {
    const addr = c.address || c.소재지도로명주소 || c.소재지지번주소;
    geocoder.addressSearch(addr, (r, s) => {
      if (s === kakao.maps.services.Status.OK) {
        setMarker(Number(r[0].y), Number(r[0].x));
      }
    });
  }
}

function setMarker(lat, lng) {
  const pos = new kakao.maps.LatLng(lat, lng);
  marker.setPosition(pos);
  map.setCenter(pos);
  map.setLevel(5);
}
