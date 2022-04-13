
// 마커를 담을 배열입니다
var markers = [];

var mapContainer = document.getElementById('map'), // 지도를 표시할 div 
    mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567), // 지도의 중심좌표
        level: 3 // 지도의 확대 레벨
    };  

// 지도를 생성합니다    
var map = new kakao.maps.Map(mapContainer, mapOption); 

// 장소 검색 객체를 생성합니다
var ps = new kakao.maps.services.Places();  

// 검색 결과 목록이나 마커를 클릭했을 때 장소명을 표출할 인포윈도우를 생성합니다
var infowindow = new kakao.maps.InfoWindow({zIndex:1});

// 키워드로 장소를 검색합니다



// 키워드 검색을 요청하는 함수입니다
document.querySelector("#searchForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const queryField = document.querySelector("#query");
        const query = queryField.value.trim();

        if (!query) {
          alert("검색어를 입력");
          queryField.focus();
          return;
        }
        ps.keywordSearch(query + ' 데이트 코스', placesSearchCB);
        queryField.value = '';
        queryField.focus();
        setWeather(map.getCenter());
      });

// 장소검색이 완료됐을 때 호출되는 콜백함수 입니다
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {

        // 정상적으로 검색이 완료됐으면
        // 검색 목록과 마커를 표출합니다
        displayPlaces(data);

        // 페이지 번호를 표출합니다
        displayPagination(pagination);

        let center = map.getCenter();
        let centerLat = center.getLat();
        let centerLng = center.getLng();

        getJSON(`http://api.openweathermap.org/data/2.5/weather?lat=${centerLat}&lon=${centerLng}&appid=ee9f78569dc69b9f6ed6ddc0fb389220&units=metric`, function(err,data) {
            // null 값이 아니면 err
            if (err !== null) {
                alert('에러입니다.')
            } else {
                console.log('현재온도는(검색지역)' + data.main.temp);
                todayClothes(data);
            }
        });

    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {

        alert('검색 결과가 존재하지 않습니다.');
        return;

    } else if (status === kakao.maps.services.Status.ERROR) {

        alert('검색 결과 중 오류가 발생했습니다.');
        return;

    }
}

// 검색 결과 목록과 마커를 표출하는 함수입니다
function displayPlaces(places) {

    var listEl = document.getElementById('placesList'), 
    menuEl = document.getElementById('menu_wrap'),
    fragment = document.createDocumentFragment(), 
    bounds = new kakao.maps.LatLngBounds(), 
    listStr = '';
    
    // 검색 결과 목록에 추가된 항목들을 제거합니다
    removeAllChildNods(listEl);

    // 지도에 표시되고 있는 마커를 제거합니다
    removeMarker();
    
    for ( var i=0; i<places.length; i++ ) {

        // 마커를 생성하고 지도에 표시합니다
        var placePosition = new kakao.maps.LatLng(places[i].y, places[i].x),
            marker = addMarker(placePosition, i), 
            itemEl = getListItem(i, places[i]); // 검색 결과 항목 Element를 생성합니다

        // 검색된 장소 위치를 기준으로 지도 범위를 재설정하기위해
        // LatLngBounds 객체에 좌표를 추가합니다
        bounds.extend(placePosition);

        // 마커와 검색결과 항목에 mouseover 했을때
        // 해당 장소에 인포윈도우에 장소명을 표시합니다
        // mouseout 했을 때는 인포윈도우를 닫습니다
        (function(marker, title) {
            kakao.maps.event.addListener(marker, 'mouseover', function() {
                displayInfowindow(marker, title);
            });

            kakao.maps.event.addListener(marker, 'mouseout', function() {
                infowindow.close();
            });

            itemEl.onmouseover =  function () {
                displayInfowindow(marker, title);
            };

            itemEl.onmouseout =  function () {
                infowindow.close();
            };
        })(marker, places[i].place_name);

        fragment.appendChild(itemEl);
    }

    // 검색결과 항목들을 검색결과 목록 Elemnet에 추가합니다
    listEl.appendChild(fragment);
    menuEl.scrollTop = 0;

    // 검색된 장소 위치를 기준으로 지도 범위를 재설정합니다
    map.setBounds(bounds);
}

// 검색결과 항목을 Element로 반환하는 함수입니다
function getListItem(index, places) {

    var el = document.createElement('li'),
    itemStr = '<span class="markerbg marker_' + (index+1) + '"></span>' +
                '<div class="info">' +
                '   <h5>' + places.place_name + '</h5>';

    if (places.road_address_name) {
        itemStr += '    <span>' + places.road_address_name + '</span>' +
                    '   <span class="jibun gray">' +  places.address_name  + '</span>';
    } else {
        itemStr += '    <span>' +  places.address_name  + '</span>'; 
    }
                 
      itemStr += '  <span class="tel">' + places.phone  + '</span>' +
                '</div>';           

    el.innerHTML = itemStr;
    el.className = 'item';

    return el;
}

// 마커를 생성하고 지도 위에 마커를 표시하는 함수입니다
function addMarker(position, idx, title) {
    var imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue.png', // 마커 이미지 url, 스프라이트 이미지를 씁니다
        imageSize = new kakao.maps.Size(36, 37),  // 마커 이미지의 크기
        imgOptions =  {
            spriteSize : new kakao.maps.Size(36, 691), // 스프라이트 이미지의 크기
            spriteOrigin : new kakao.maps.Point(0, (idx*46)+10), // 스프라이트 이미지 중 사용할 영역의 좌상단 좌표
            offset: new kakao.maps.Point(13, 37) // 마커 좌표에 일치시킬 이미지 내에서의 좌표
        },
        markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions),
            marker = new kakao.maps.Marker({
            position: position, // 마커의 위치
            image: markerImage 
        });

    marker.setMap(map); // 지도 위에 마커를 표출합니다
    markers.push(marker);  // 배열에 생성된 마커를 추가합니다

    console.log(marker);
    console.log(markers);


    return marker;
}

// 지도 위에 표시되고 있는 마커를 모두 제거합니다
function removeMarker() {
    for ( var i = 0; i < markers.length; i++ ) {
        markers[i].setMap(null);
    }   
    markers = [];
}

// 검색결과 목록 하단에 페이지번호를 표시는 함수입니다
function displayPagination(pagination) {
    var paginationEl = document.getElementById('pagination'),
        fragment = document.createDocumentFragment(),
        i; 

    // 기존에 추가된 페이지번호를 삭제합니다
    while (paginationEl.hasChildNodes()) {
        paginationEl.removeChild (paginationEl.lastChild);
    }

    for (i=1; i<=pagination.last; i++) {
        var el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;

        if (i===pagination.current) {
            el.className = 'on';
        } else {
            el.onclick = (function(i) {
                return function() {
                    pagination.gotoPage(i);
                }
            })(i);
        }

        fragment.appendChild(el);
    }
    paginationEl.appendChild(fragment);
}




// 검색결과 목록 또는 마커를 클릭했을 때 호출되는 함수입니다
// 인포윈도우에 장소명을 표시합니다
function displayInfowindow(marker, title) {
    var content = '<div style="padding:5px;z-index:1;">' + title + '</div>';

    infowindow.setContent(content);
    infowindow.open(map, marker);
}

 // 검색결과 목록의 자식 Element를 제거하는 함수입니다
function removeAllChildNods(el) {   
    while (el.hasChildNodes()) {
        el.removeChild (el.lastChild);
    }
}

// 지도에 마커와 인포윈도우를 표시
function displayMarkerWithMessage(locPosition, message) {

// 마커 생성
let marker = new kakao.maps.Marker({  
    map: map, 
    position: locPosition
}); 

let iwContent = message,
    iwRemoveable = true;

// 인포윈도우 생성
let infowindow = new kakao.maps.InfoWindow({
    content : iwContent,
    removable : iwRemoveable
});

infowindow.open(map, marker);

// 지도 좌표를 접속위치로 변경
map.setCenter(locPosition);      
}   



const loc_btn = document.querySelector("#loc_btn");
loc_btn.addEventListener("click", (e) => {
    // 주소-좌표 변환 객체를 생성합니다
    var geocoder = new kakao.maps.services.Geocoder();
    
    let lat = null;         // 현재 latitude
    let lon = null;         // 현재 longitude
    let myLocation = "";    // 문자로 된 현재 위치
    
    if (navigator.geolocation) { // GPS를 지원하면
        navigator.geolocation.getCurrentPosition(function(position) {
            console.log(position.coords.latitude);
            lat = position.coords.latitude;
            console.log(position.coords.longitude);
            lon = position.coords.longitude;
            map.setCenter(new kakao.maps.LatLng(lat, lon));
            map.setLevel(4, {animate: true});

            // 현재 지도 중심좌표로 주소를 검색해서 지도 좌측 상단에 표시합니다
        
            searchAddrFromCoords(map.getCenter(), displayCenterInfo);
            setWeather(map.getCenter());
        });
    }
        
        function searchAddrFromCoords(coords, callback) {
            // 좌표로 행정동 주소 정보를 요청합니다
            geocoder.coord2RegionCode(coords.getLng(), coords.getLat(), callback);         
        }
        
        // 지도 좌측상단에 지도 중심좌표에 대한 주소정보를 표출하는 함수입니다
        function displayCenterInfo(result, status) {
            if (status === kakao.maps.services.Status.OK) {
                for(var i = 0; i < result.length; i++) {
                    // 행정동의 region_type 값은 'H' 이므로
                    if (result[i].region_type === 'H') {
                        // infoDiv.innerHTML = result[i].address_name;
                        console.log(result[i].address_name);
                        myLocation = result[i].address_name;
                        console.log(myLocation);
                        break;
                    }
                }
            }
            // 장소검색 객체를 통해 키워드로 장소검색을 요청합니다
            console.log(myLocation + ' 데이트 코스');
            ps.keywordSearch(myLocation + ' 데이트 코스', placesSearchCB);
        }
});

// https://stackoverflow.com/questions/12460378/how-to-get-json-from-rul-in-javascript
const getJSON = function(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
        // 접속이 성공적이면 null값반환, 그외는 status 값 반환
        const status = xhr.status;
        if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    };
    xhr.send();
};

function setWeather(coords) {
    getJSON("http://api.openweathermap.org/data/2.5/weather?lat="+coords.getLat()+"&lon="+coords.getLng()+"&appid=ee9f78569dc69b9f6ed6ddc0fb389220&units=metric", function(err,data) {
        // null 값이 아니면 err
        if (err != null) {
            alert('에러입니다.')
        } else {
            const weatherWrap = document.querySelector("#weather_wrap");
            weather_wrap.style.opacity = "1"; 


            const weatherTxt = document.querySelector("#weather_txt");
            weatherTxt.innerHTML = '현재 온도: ' + data.main.temp + '도, ' + data.weather[0].main;
            
            const weatherImg = document.querySelector("#weather_img");
            weatherImg.src = "http://openweathermap.org/img/w/" + data.weather[0].icon + ".png";
        }
    })
}

// 옷차림을 추천하는 함수
function todayClothes(data) {
    let clothes = document.querySelector('.today-clothes');
    let currentTemp = data.main.temp;

    let winter = currentTemp <= 4;
    let earlyWinter = currentTemp >= 5 && currentTemp < 9;
    let beginWinter = currentTemp >= 9 && currentTemp < 12;
    let fall = currentTemp >= 12 && currentTemp < 17;
    let earlyFall = currentTemp >= 17 && currentTemp < 20;
    let earlySummer = currentTemp >= 20 && currentTemp < 23;
    let beginSummer = currentTemp >= 23 && currentTemp < 28;
    let summer = currentTemp >= 28;

    if(winter) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는</h3></li>
        <li><span><img src="img/padding.png">패딩</span></li>
        <li><span><img src="img/longcoat.png">두꺼운 코트</span></li>
        <li><span><img src="img/neck.png">목도리</span></li>
        <li><span><img src="img/kimo.png">기모의류</span></li>
        `;
    } else if(earlyWinter) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는</h3></li>
        <li><span><img src="img/jacket.png">코트</span></li>
        <li><span><img src="img/coat.png">가죽자켓</span></li>
        <li><span><img src="img/longcoat.png">발열내의</span></li>
        <li><span><img src="img/neat.png">니트</span></li>
        <li><span><img src="img/pants.png">레깅스</span></li>
        `;
    } else if(beginWinter) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는..</h3></li>
        <li><span><img src="img/jacket.png">자켓</span></li>
        <li><span><img src="img/coat.png">트렌치코트</span></li>
        <li><span><img src="img/longcoat.png">야상</span></li>
        <li><span><img src="img/neat.png">니트</span></li>
        <li><span><img src="img/pants.png">청바지</span></li>
        `;
    } else if(fall) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는..</h3></li>
        <li>얇은 니트</li>
        <li>맨투맨</li>
        <li>가디건</li>
        <li>청바지</li>
        `;
    } else if(earlyFall) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는..</h3></li>
        <li>얇은 가디건</li>
        <li>긴팔</li>
        <li>면바지</li>
        <li>청바지</li>
        `;
    } else if(earlySummer) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는..</h3></li>
        <li>얇은 가디건</li>
        <li>얇은 셔츠</li>
        <li>반바지</li>
        <li>면바지</li>
        `;
    } else if(beginSummer) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는..</h3></li>
        <li>반팔</li>
        <li>얇은 셔츠</li>
        <li>반바지</li>
        <li>면바지</li>
        `;
    } else if(summer) {
        clothes.innerHTML = `
        <li><h3>지금 날씨에는..</h3></li>
        <li>민소매</li>
        <li>반팔</li>
        <li>반바지</li>
        <li>면바지</li>
        <li>원피스</li>
        `;
    }
}