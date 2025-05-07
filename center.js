/**
 * 전국치매센터표준데이터 + Kakao 지도 연동
 *  - CORS 우회: corsproxy.io (테스트용)
 *  - 실제 서비스 배포 시에는 백엔드 프록시로 대체 권장
 */

/* ----- 공공데이터포털 키 & URL ----- */
const DATA_KEY = "HgzvYuKdNpoFiw5vdD6y06tR2gI5TNW5J8u1Ktjvb58HLnvkDwW7iW6e0YUYR0IIR%2FpVEKsbKSWduyM%2B49g%3D%3D";  // Encoding 키
const ENDPOINT = "https://api.odcloud.kr/api/15021138/v1/centers";
const QUERY    = `?serviceKey=${DATA_KEY}&page=1&perPage=1000`;
const CORS_URL = `https://corsproxy.io/?${encodeURIComponent(ENDPOINT + QUERY)}`;

/* ----- 전역 ----- */
let centers = [];
let map, marker, geocoder;

/* ===== 초기 구동 ===== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCenters();       // 1) 데이터 로딩
  buildSelect();             // 2) 드롭다운 생성
  initMap();                 // 3) 지도 초기화

  document.getElementById("provinceSelect")
          .addEventListener("change", renderByProvince);

  renderByProvince();        // 첫 화면
});

/* ------------------------------------------------ */
/* 1. 데이터 로딩                                   */
/* ------------------------------------------------ */
async function loadCenters() {
  try {
    const res  = await fetch(CORS_URL);
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    centers    = json.data || [];           // odcloud 구조
  } catch (err) {
    alert("치매센터 데이터를 불러오지 못했습니다.");
    console.error(err);
  }
}

/* ------------------------------------------------ */
/* 2. 시·도 셀렉트 박스                             */
/* ------------------------------------------------ */
function buildSelect() {
  const provinces = [...new Set(
    centers.map(c => c.address.split(" ")[0])
  )].sort();

  const sel = document.getElementById("provinceSelect");
  provinces.forEach(p => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = p;
    sel.appendChild(opt);
  });
}

/* ------------------------------------------------ */
/* 3. Kakao 지도                                    */
/* ------------------------------------------------ */
function initMap() {
  map      = new kakao.maps.Map(document.getElementById("map"), {
               center: new kakao.maps.LatLng(36.5, 127.5),
               level : 12
             });

  marker   = new kakao.maps.Marker({
               map,
               image: new kakao.maps.MarkerImage(
                 "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
                 new kakao.maps.Size(24, 35)
               )
             });

  geocoder = new kakao.maps.services.Geocoder();
}

/* ------------------------------------------------ */
/* 4. 지역 변경 → 목록 & 지도                       */
/* ------------------------------------------------ */
function renderByProvince() {
  const province = document.getElementById("provinceSelect").value;
  const listData = centers.filter(c => c.address.startsWith(province));
  renderList(listData);
  if (listData.length) moveToCenter(listData[0]);
}

/* 왼쪽 카드 목록 렌더 */
function renderList(items) {
  const wrap = document.getElementById("list");
  wrap.innerHTML = "";

  items.forEach(c => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h4>${c.centerName}</h4>
      <div>${c.address}</div>
      <div class="phone"><span class="icon">☎</span>${c.phone || "-"}</div>
    `;
    card.onclick = () => moveToCenter(c);
    wrap.appendChild(card);
  });
}

/* 지도 이동 */
function moveToCenter(c) {
  if (c.lat && c.lng) {
    setMarker(Number(c.lat), Number(c.lng));
  } else {
    geocoder.addressSearch(c.address, (r, s) => {
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
