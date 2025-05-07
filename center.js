/* ------------------------------------------------------------------
   1) 공공데이터포털 → 전국치매센터표준데이터
      - 서비스키(Encoding) 그대로 사용
      - 간단 서버에서 실행 필수 (Live Server, python -m http.server 등)
   ------------------------------------------------------------------ */
   const DATA_KEY = "HgzvYuKdNpoFiw5vdD6y06tR2gI5TNW5J8u1Ktjvb58HLnvkDwW7iW6e0YUYR0IIR%2FpVEKsbKSWduyM%2B49g%3D%3D";
   const ENDPOINT = "https://api.odcloud.kr/api/15021138/v1/centers";
   const QUERY    = `?serviceKey=${DATA_KEY}&page=1&perPage=2000&type=json`;  // 넉넉히 2,000건
   const ORIGIN   = ENDPOINT + QUERY;
   
   /*  ---- CORS 프록시 3단 폴백 ---- */
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
   
   /* ---------------- 전역 ---------------- */
   let centers = [];          // 전체 원본
   let map, marker, geocoder; // Kakao 지도
   
   /* ---------------- 초기 ---------------- */
   document.addEventListener("DOMContentLoaded", async () => {
     await loadCenters();            // 데이터 ↓
     initMap();                      // 지도 ↓
     document.getElementById("provinceSelect")
             .addEventListener("change", renderByProvince);
   });
   
   /* 1) 데이터 로딩 ---------------------------------------------------- */
   async function loadCenters() {
     try {
       const res  = await fetchViaProxy(ORIGIN);
       const json = await res.json();
       centers    = json.data || json.items || json.response?.body?.items?.item || [];
       if (!centers.length) throw new Error("데이터 레코드 0");
     } catch (err) {
       console.error("[치매센터] 로딩 실패:", err);
       alert("치매센터 데이터를 불러오지 못했습니다.\n(서비스키 또는 네트워크 확인)");
     }
   }
   
   /* 2) Kakao 지도 ---------------------------------------------------- */
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
   
   /* 3) 시·도 선택 → 목록·지도 ---------------------------------------- */
   function renderByProvince() {
     const prov = document.getElementById("provinceSelect").value;
     const list = centers.filter(c =>
       (c.address || c.소재지도로명주소 || "").startsWith(prov)
     );
     renderList(list);
     if (list.length) moveToCenter(list[0]);
   }
   
   /* 목록 그리기 */
   function renderList(arr) {
     const wrap = document.getElementById("list");
     wrap.innerHTML = "";
   
     arr.forEach((c, idx) => {
       const name = c.centerName          || c.치매안심센터명     || "치매안심센터";
       const addr = c.address             || c.소재지도로명주소   || c.소재지지번주소 || "-";
       const tel  = c.phone               || c.관리기관전화번호     || "-";
   
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
   