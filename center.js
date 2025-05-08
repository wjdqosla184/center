
const DATA_KEY = "HgzvYuKdNpoFiw5vdD6y06tR2gI5TNW5J8u1Ktjvb58HLnvkDwW7iW6e0YUYR0IIR/pVEKsbKSWduyM+49g==";
const ENDPOINT = "https://api.data.go.kr/openapi/tn_pubr_public_imbclty_cnter_api";
const QUERY    = `?serviceKey=${encodeURIComponent(DATA_KEY)}&pageNo=1&numOfRows=1000&type=json`;
const ORIGIN   = ENDPOINT + QUERY;

// ---- CORS 프록시 3단 폴백 ---- 
async function fetchViaProxy(url) {
  const tryUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://thingproxy.freeboard.io/fetch/${url}`,
    `https://corsproxy.io/?${url}`
  ];
  for (const u of tryUrls) {
    try {
      const r = await fetch(u, {cache:"no-store"});
      if (r.ok) return r;
    } catch (_) { /* 다음 프록시 시도 */ }
  }
  throw new Error("CORS 프록시 모두 실패");
}

// ---------------- 전역 ----------------
let centers = [];          // 전체 원본
let map, marker, geocoder; // Kakao 지도

// ---------------- 초기 ---------------- 
document.addEventListener("DOMContentLoaded", async () => {
  await loadCenters();            // 데이터 ↓
  initMap();                      // 지도 ↓
  document.getElementById("provinceSelect")
          .addEventListener("change", renderByProvince);
});

// 데이터 로딩 ----------------------------------------------------
async function loadCenters() {
  try {
    const res  = await fetchViaProxy(ORIGIN);
    const json = await res.json();

    // 개방형 공공 API는 'response.body.items.item' 경로에 배열이 있음
    centers = json.data                              // ODCLOUD 형태
           || json.items                             // 간단 형태
           || json.response?.body?.items?.item       // OPENAPI 형태
           || [];
    if (!centers.length) throw new Error("데이터 레코드 0");
  } catch (err) {
    console.error("[치매센터] 로딩 실패:", err);
    alert("치매센터 데이터를 불러오지 못했습니다.\n(서비스키 또는 네트워크 확인)");
  }
}

// Kakao 지도 ----------------------------------------------------
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

// 시·도 선택 → 목록·지도 ---------------------------------------- 
function renderByProvince() {
  const prov = document.getElementById("provinceSelect").value;
  // 주소 앞 단어(시·도) 로 시작하는 레코드만 추림
  const list = centers.filter(c => {
    const addr = (c.rdnmadr || c.lnmadr || c.address || c.소재지도로명주소 || "");
    return addr.startsWith(prov);
  });

  renderList(list);
  if (list.length) moveToCenter(list[0]);
}

//목록 그리기
function renderList(arr) {
  const wrap = document.getElementById("list");
  wrap.innerHTML = "";

  arr.forEach(c => {
    const name = c.cnterNm            || c.centerName || c.치매안심센터명 || "치매안심센터";
    const addr = c.rdnmadr            || c.lnmadr     || c.address     || c.소재지도로명주소 || "-";
    const tel  = c.operPhoneNumber    || c.phoneNumber|| c.관리기관전화번호     || "-";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h4>${name}</h4>
      <div>${addr}</div>
      <div class="phone"><span class="icon">☎</span>${tel}</div>
    `;
    card.addEventListener("click", () => moveToCenter(c));
    wrap.appendChild(card);
  });
}

// 지도 포커스
function moveToCenter(c) {
  const lat = parseFloat(c.latitude  || c.lat || c.위도);
  const lng = parseFloat(c.longitude || c.lng || c.경도);

  if (!isNaN(lat) && !isNaN(lng)) {
    setMarker(lat, lng);
  } else {
    const addr = c.rdnmadr || c.lnmadr || c.address || c.소재지도로명주소;
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
