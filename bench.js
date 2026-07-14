let rdg=state=>((state+0xD0B)*0xD0BD^(0xAEDEAABD-1))>>>0

let lib={
    rerdbs:{
       messageStart:"Добро пожаловать на эту страницу! Здесь, вы можете настроить и запустить бенчмарк RERDBS<br>",
       about:"RERDBS(REal Random Dobrofiner's Benchmark / Second) это комплексный бенчмарк, в котором каждый цикл процессор генерирует случайное число и с шансом 50% выполняет либо случайный либо последовательный доступ к памяти,тем самым выполняя ветвление. Потом после доступа к памяти он выполняет расчет выражения <code>((x/y)+x*0.1-y)</code>, в котором ровно по один раз встречаются все действия и если вклчено, результат еще пишет в массив результатов,и так пока время не кончится(точность - 1 миллисекунда). Во время работы, страница может зависнуть.",
       settings:`Поддерживаемые параметры:<br>
        Время работы(мс):<input id="time" type="text" value="1000"><br>
        Размер датасета(хранится как float64,осторожно: не сделайте слишком огромным,иначе в памятьможет и не влезть):<input id="dataSize" type="text" value="1_000_000"><br>
        Сид(любое число от 0 до 4.2 млрд с чем-то, то есть 32ух битное число):<input id="seed" type="text" value="1"><br>
        <input type="checkbox" id="write">Писать ли результаты в массив?<br>
        `,
       buttons:`<button id="start" class="dbtn" onclick="startBench('rerdbs')">Запустить бенчмарк!</button>`
    },
    dlops:{
        messageStart:"Добро пожаловать на эту страницу! Здесь, вы можете настроить и запустить бенчмарк DLOPS<br>",
        about:`DLOPS(Dobrofiner's Linear Operations Per Second) это бенчмарк,в котором реккурентно вычисляется система <code>x=((x/iters)+d*0.1)/x</code>, где d - номер итерации....Во время работы, страница может зависнуть.`,
        settings:`Поддерживаемые параметры:<br>
        Кол-во итераций:<input id="iters" type="text" value="1_000_000"><br>
        Стартовое значение:<input id="x" type="text" value="0.1"><br>
        `,
        buttons:`<button id="start" class="dbtn" onclick="startBench('dlops')">Запустить бенчмарк!</button>`,
    },rwops:{
        messageStart:"Добро пожаловать на эту страницу! Здесь, вы можете настроить и запустить бенчмарк RWOPS<br>",
        about:`RWOPS(RazWeighting Operations Per Second) это бенчмарк, который показывает с какой скоростью может ваш процессор, но в данный момент только в браузере, развещивать - <code>inp[0]/rw[0]-inp[1]/rw[1]-...-inp[d]/rw[d]</code>. Определяет, как быстро процессор может что либо делать с <a href="https://github.com/dobrofiner/razweighted_neuron">развещанным нейроном</a>, например его обучать и т.д.`,
        settings:`Поддерживаемые параметры:<br>
        Размер датасетов(внимание: их будет 2,и в float64):<input id="dataSize" type="text" value="50_000_000"><br>
        Сид(uint32):<input id="seed" type="text" value="1"><br>
        `,
        buttons:`<button id="start" class="dbtn" onclick="startBench('rwops')">Запустить бенчмарк!</button>`,
    }
}
let benchData={
    rerdbs:{
        runF:(write,...args)=>{
            if(write){
                let res=dobBench2(...args)
                res.write=write
                return res
            }else{
                let res= dobBench2NoWrite(...args)
                res.write=write
                return res
            }
        },
        getData:()=>{
            let time=parseInt(document.getElementById("time").value||1000)
            let dataSize=parseInt(document.getElementById("dataSize").value||1_000_000)
            let seed=parseInt(document.getElementById("seed").value||1)
            let write=document.getElementById("write").checked
            return [write,time,dataSize,seed]
        },
        renderRes:(data)=>{
            let html=""
            if(data.write){
                html=`Время работы:${data.time} мс<br>
                    Скорость:${data.speed} RERDBS<br>
                    Результаты все... их слишком много, чтоб вместить так что их можно скачать в json вместе с результатами<br>`
            }else{
                html=`Время работы:${data.time} мс<br>
                    Скорость:${data.speed} RERDBS<br>
                    Z самый последний:${data.z}`
            }
            html+=`<br><button class="dbtn" onclick="downloadRes(${results.length})">Скачать результат</button>`
            results[results.length]={data,type:"rerdbs"}
            return html
        }
    },
    dlops:{
        runF:(...args)=>dlopsX(...args),
        getData:()=>{
            let iters=parseInt(document.getElementById("iters").value||1_000_000)
            let x=parseFloat(document.getElementById("x").value||0.1)
            return [iters,x]
        },
        renderRes:(data)=>{
            let html=`Время работы:${data.time} мс<br>
            Скорость:${data.speed} DLOPS<br>
            X в конце:${data.x}<br>
            <button class="dbtn" onclick="downloadRes(${results.length})">Скачать результат</button>`
            results[results.length]={data,type:"dlops"}
            return html
        }
    },
    rwops:{
        runF:(...args)=>benchRW(...args),
        getData:()=>{
            let size=parseInt(document.getElementById("dataSize").value)||100_000_000
            let seed=parseInt(document.getElementById("seed").value)
            return [size,seed]
        },
        renderRes:(data)=>{
            html=`Время работы:${data.time} мс<br>
            Скорость:${data.speed} RWOPS<br>
            Накопленно:${data.total}
            <br><button class="dbtn" onclick="downloadRes(${results.length})">Скачать результат</button>`
            results[results.length]={data,type:"rwops"}
            return html  
        }
    }
}
let prettyNames={
    dlops:"DLOPS",
    rwops:"RWOPS",
    rerdbs:"RERDBS"
}
let results=[]
function getType(){
    let things=new URL(document.location)
    return things.searchParams.get("bench")
}
function load(name){
    let data=lib[name.toLowerCase()]||lib["rerdbs"]
    document.title="Бенчмарки - "+prettyNames[name.toLowerCase()]
    for(let d in data){
        if(data.hasOwnProperty(d)){
            document.getElementById(d).innerHTML=data[d]
        }
    }
}
load(getType())
function startBench(name="rwops"){
    let data=benchData[name.toLowerCase()]||benchData['rerdb']
    let settings=data.getData()
    let result=data.runF(...settings)
    let renderedRes=data.renderRes(result)
    document.getElementById("result").innerHTML=renderedRes
}
function downloadString(string, mime, name,charset="charset=utf-8",base64=false) {
    const a = document.createElement("a");
    a.href = "data:" + (mime || "text/plain")+";"+charset+";" +(base64?"base64":"")+ "," + encodeURIComponent(string);
    a.setAttribute("download", name || "");
    a.click();
    return a.href;
}
function downloadRes(id){
    let data=results[id]
    let json=JSON.stringify(data)
    downloadString(json,"application/json",`Результаты бенчмарка - ${prettyNames[data.type]}.json`,"charset=utf-8",false)
}
function dlopsX(iters,x){
let start=performance.now()
for(let d=1;d<=iters;d++){
x=((x/iters)+d*0.1)/x
}
let end=performance.now()
    return {x,time:end-start,speed:1000/((end-start)/iters)}
}
function dobBench2(time,bufferLength=1_000_000,seed){
    let buf=new Float64Array(bufferLength),stateGen=seed,stateWork=seed+1
    for(let d=0;d<buf.length;d++){
        buf[d]=stateGen/(2**32)
        stateGen=rdg(stateGen)
    }
    let iters=0
    let idx=0
    let results=[]
        let start=Date.now()
    while(Date.now()-start<time){
        let x,y
        if(stateWork>=2**31){//последолвталеьный доступ
            stateWork=rdg(stateWork)
            x=buf[idx]
            y=buf[idx+1]
            stateWork=rdg(stateWork)
            idx=(idx+1)%bufferLength
        }else{
            stateWork=rdg(stateWork)
            x=buf[stateWork%bufferLength]
            stateWork=rdg(stateWork)
            y=buf[stateWork%bufferLength]
        }
        iters++
         results[results.length]=((x/y)+x*0.1-y)
    }
    let end=Date.now()
    return {time:end-start,speed:1000/((end-start)/iters),results,unit:"RERDBS"}
}
    
function dobBench2NoWrite(time,bufferLength=1_000_000,seed){
    let buf=new Float64Array(bufferLength),stateGen=seed,stateWork=seed+1
    for(let d=0;d<buf.length;d++){
        buf[d]=stateGen/(2**32)
        stateGen=rdg(stateGen)
    }
    let iters=0
    let idx=0
    let results=[]
        let start=Date.now()
        let z=0
    while(Date.now()-start<time){
        let x,y
        if(stateWork>=2**31){//последолвталеьный доступ
            stateWork=rdg(stateWork)
            x=buf[idx]
            y=buf[idx+1]
            stateWork=rdg(stateWork)
            idx=(idx+1)%bufferLength
        }else{
            stateWork=rdg(stateWork)
            x=buf[stateWork%bufferLength]
            stateWork=rdg(stateWork)
            y=buf[stateWork%bufferLength]
        }
        iters++
        z=((x/y)+x*0.1-y)
    }
    let end=Date.now()
    return {time:end-start,speed:1000/((end-start)/iters),unit:"RERDBS",z}
}
function benchRW(length,seed){
    let state=seed,state2=seed+1
    let vect=new Float64Array(length),vect2=new Float64Array(length)
    for(let d=0;d<length;d++){
        vect[d]=rdg(state)/2**32
        state=rdg(state)
        vect2[d]=rdg(state2)/2**32
        state2=rdg(state2)
    }
    let start=performance.now()
    let total=vect[0]/vect2[0]
    for(let d=1;d<length;d++){
    total-=vect[d]/vect2[d]
    }
    let end=performance.now()
    return {total,time:end-start,speed:1000/((end-start)/length),unit:"RWOPS"}
}