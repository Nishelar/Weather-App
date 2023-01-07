const API_Key="577f504270ee97ef266c04b748c4759d"; 

const DAYS_OF_THE_WEEK=["sun","mon","tue","wed","thu","fri","sat"];

let selectedCityText;
let selectedCity;

const getCitiesUsingGeoLocation = async (searchText)=>{
    const response=await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_Key}`);
    return response.json();
}
const getCurrentWeatherData=async({lat,lon,name:city})=>{
    const url=lat&&lon? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_Key}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_Key}&units=metric`;
    const response=await fetch(url);
    return response.json();
} 

const formatTemperature=(temp)=>`${temp?.toFixed(2)}°`;
const createIconUrl=(icon)=>`http://openweathermap.org/img/wn/${icon}@2x.png`;

const getHourlyForecast=async({ name:city })=>{
    const response=await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_Key}&units=metric`);
    const data=await response.json();
    return data.list.map(forecast=>{
        const{main:{temp,temp_max,temp_min},dt,dt_txt,weather:[{description,icon}]}=forecast;
        return{temp,temp_max,temp_min,dt,dt_txt,description,icon};
    })
}

const loadCurrentWeatherInfo=({ name,main:{ temp,temp_max,temp_min},weather:[{description,icon}] })=>{
   const CurrentForecastElement=document.getElementById("current-forecast");
   CurrentForecastElement.querySelector(".city").textContent=name;
   CurrentForecastElement.querySelector(".temp").textContent=formatTemperature(temp);
   CurrentForecastElement.querySelector(".desc").textContent=description;
   CurrentForecastElement.querySelector(".min-max").textContent=`H: ${formatTemperature(temp_max)} L:${formatTemperature(temp_min)}`;

}

const loadHourlyForecast=({ main: { temp: tempNow},weather:[{ icon: iconNow}]},hourlyForecast)=>{
   console.log(hourlyForecast);
   const timeFormatter=Intl.DateTimeFormat("en",{hour12:true,
    hour:"numeric"
   })
   let datafor12hours=hourlyForecast.slice(2,14);
   const hourlyContainer=document.querySelector(".hourly-container");
   let innerHTMLString=`
   <article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createIconUrl(iconNow)}" alt="">
    <p class="hourly-temp">${formatTemperature(tempNow)}</p>
    </article>`;

   for(let{temp,icon,dt_txt} of datafor12hours){
    innerHTMLString+=`
    <article>
    <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
    <img class="icon" src="${createIconUrl(icon)}" alt="">
    <p class="hourly-temp">${formatTemperature(temp)}</p>
    </article>`
   }
   hourlyContainer.innerHTML=innerHTMLString;
}
const calculatedayWiseForecast=(hourlyForecast)=>{
    let dayWiseForecast=new Map();
    for(let forecast of hourlyForecast){
        const[date]=forecast.dt_txt.split(" ");
        const dayOfTheWeek=DAYS_OF_THE_WEEK[new Date(date).getDay()];
        console.log(dayOfTheWeek);
        if(dayWiseForecast.has(dayOfTheWeek)){
            let forecastForTheDay=dayWiseForecast.get(dayOfTheWeek);
            forecastForTheDay.push(forecast);
            dayWiseForecast.set(dayOfTheWeek,forecastForTheDay);
        }
        else{
            dayWiseForecast.set(dayOfTheWeek,[forecast])
        }
    }
    console.log(dayWiseForecast);
    for(let [key,value] of dayWiseForecast){
        let temp_min=Math.min(...Array.from(value,val=>val.temp_min));
        let temp_max=Math.max(...Array.from(value,val=>val.temp_max));
        dayWiseForecast.set(key,{temp_min,temp_max,icon:value.find(v=>v.icon).icon});
    }
    console.log(dayWiseForecast);
    return dayWiseForecast;
}
const loadFiveDayForecast=(hourlyForecast)=>{
    console.log(hourlyForecast);
    const dayWiseForecast=calculatedayWiseForecast(hourlyForecast);
    const container=document.querySelector(".fiveday-forecast-container");
    let daywiseinfo="";
    Array.from(dayWiseForecast).map(([day,{temp_max,temp_min,icon}],index)=>{
        if(index<5){
            daywiseinfo+=`<article class="daywise-forecast">
            <h3>${index===0 ? "Today" :day}</h3>
            <img class="icon" src="${createIconUrl(icon)}" alt="icon for the forecast">
            <p class="min-temp">${formatTemperature(temp_min)}</p>
            <p class="max-temp">${formatTemperature(temp_max)}</p>
        </article>`
        }
    });
    container.innerHTML=daywiseinfo;
}
const loadFeelsLike=({main:{feels_like}})=>{
    let container=document.querySelector("#feels-like");
    container.querySelector(".feels-like-temp").textContent=formatTemperature(feels_like);
}

const loadHumidity=({main:{humidity}})=>{
    let container=document.querySelector("#humidity");
    container.querySelector(".humidity-value").textContent=`${humidity} %`
}

const loadForecastUsingGeoLocation=()=>{
    navigator.geolocation.getCurrentPosition(({coords})=>{
         const {latitude:lat,longitude:lon}=coords;
         selectedCity={lat,lon};
         LoadData(); 
    },error=>console.log(error),{enableHighAccuracy:true,timeout:5000,maximumAge:0});

}
const LoadData=async()=>{
    const currentWeather=await getCurrentWeatherData(selectedCity);
    loadCurrentWeatherInfo(currentWeather);
    const hourlyForecast=await getHourlyForecast(currentWeather);
    loadHourlyForecast(currentWeather,hourlyForecast);
    loadFiveDayForecast(hourlyForecast);
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
    console.log("done");
}
function debounce(func){
    let timer;
    return (...args)=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
         func.apply(this,args)
      },500);
    }
}
const onSearchChange = async(event)=>{
    let {value}=event.target;
    if(!value){
        selectedCity=null;
        selectedCityText="";
    }
    if(value && (selectedCityText!==value)){
    const listOfCities=await getCitiesUsingGeoLocation(value);
    let options="";
    for(let{lat,lon,name,state,country} of listOfCities){
        options+=`<option data-city-details='${JSON.stringify({lat,lon,name})}'} value=${name},${state},${country}></option>` 
    }
    document.querySelector("#cities").innerHTML=options;
    console.log(listOfCities);
}
}

const handleCitySelection=(event)=>{
   console.log("selection done")
   selectedCityText=event.target.value;
   let options=document.querySelector("#cities > option");
   let res=Object.assign({},options.dataset);
   console.log(res);
   console.log(options);
   if(res){
    let selectedOption=JSON.parse(JSON.stringify(options.dataset));
    selectedCity=JSON.parse(selectedOption.cityDetails);
    LoadData();
   }
}
const debounceSearch=debounce((event)=>onSearchChange(event));

document.addEventListener("DOMContentLoaded",async ()=>{
    loadForecastUsingGeoLocation();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input",debounceSearch);
    searchInput.addEventListener("change",handleCitySelection);
    
})