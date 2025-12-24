// 1. 오디오 관련
const audio_play = document.querySelector(".audio_play");
const audio_stop = document.querySelector(".audio_stop");
const audio_source = document.querySelector(".audio_source");
function playAudio() { audio_source.volume = 0.3; audio_source.loop = true; audio_source.play(); }
function stopAudio() { audio_source.pause(); }
audio_play.addEventListener('click', playAudio);
audio_stop.addEventListener('click', stopAudio);

// 2. 이미지 추가 및 편집
const toolImage = document.querySelector(".tool_image");
const fileInput = document.getElementById("file_input");
const canvasContainer = document.getElementById("canvas");

toolImage.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        createImageElement({ src: event.target.result, left: "100px", top: "100px", width: "150px" });
        fileInput.value = ""; 
    };
    reader.readAsDataURL(file);
});

function createImageElement(data) {
    const container = document.createElement("div");
    container.className = "img_container";
    Object.assign(container.style, { left: data.left, top: data.top, width: data.width, position: "absolute", pointerEvents: "auto" });
    container.innerHTML = `<img src="${data.src}" style="width:100%; height:100%;"><div class="btn_delete">X</div><div class="resizer"></div>`;
    
    container.querySelector(".btn_delete").addEventListener("click", (e) => { e.stopPropagation(); container.remove(); });
    const resizer = container.querySelector(".resizer");
    resizer.addEventListener("mousedown", (e) => {
        e.preventDefault(); e.stopPropagation();
        const startWidth = container.offsetWidth, startX = e.clientX;
        const doResize = (m) => { if (startWidth + (m.clientX - startX) > 30) container.style.width = startWidth + (m.clientX - startX) + "px"; };
        const stopResize = () => { window.removeEventListener("mousemove", doResize); window.removeEventListener("mouseup", stopResize); };
        window.addEventListener("mousemove", doResize); window.addEventListener("mouseup", stopResize);
    });
    container.addEventListener("mousedown", (e) => {
        if(e.target === resizer || e.target.classList.contains("btn_delete")) return;
        let shiftX = e.clientX - container.getBoundingClientRect().left, shiftY = e.clientY - container.getBoundingClientRect().top;
        const onMouseMove = (ev) => { container.style.left = ev.pageX - shiftX + 'px'; container.style.top = ev.pageY - shiftY + 'px'; };
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = () => { document.removeEventListener('mousemove', onMouseMove); document.onmouseup = null; };
    });
    canvasContainer.appendChild(container);
}

// 3. 조명 및 줄 그리기
const toolLight = document.querySelector(".tool_light");
const toolCheck = document.querySelector(".tool_check");
const lineCanvas = document.getElementById("line_layer");
const lineCtx = lineCanvas.getContext("2d");
const lightCanvas = document.getElementById("light_layer");
const lightCtx = lightCanvas.getContext("2d");
const imageSave = document.querySelector(".image_save");

let isDrawingMode = false, isPainting = false;
let lastX = 0, lastY = 0, distanceCounter = 0, time = 0;
let lightPoints = [], isFinished = false;

function resizeCanvas() {
    lineCanvas.width = lightCanvas.width = window.innerWidth;
    lineCanvas.height = lightCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawLight(x, y) {
    lightPoints.push({ x, y });
    lineCtx.beginPath();
    lineCtx.arc(x, y, 10, 0, Math.PI * 2);
    lineCtx.fillStyle = "#000000";
    lineCtx.fill();
    lineCtx.closePath();
}

toolLight.addEventListener("click", (e) => {
    e.preventDefault();
    isDrawingMode = !isDrawingMode;
    toolLight.classList.toggle("active", isDrawingMode);
    lightCanvas.style.pointerEvents = isDrawingMode ? "auto" : "none";
    lightCanvas.style.cursor = isDrawingMode ? "crosshair" : "default";
});

lightCanvas.addEventListener("mousedown", (e) => {
    if (!isDrawingMode) return;
    isPainting = true;
    [lastX, lastY] = [e.clientX, e.clientY];
    distanceCounter = 0;
    drawLight(e.clientX, e.clientY);
});

lightCanvas.addEventListener("mousemove", (e) => {
    if (!isPainting || !isDrawingMode) return;
    lineCtx.beginPath();
    lineCtx.strokeStyle = "#000000";
    lineCtx.lineWidth = 3;
    lineCtx.lineCap = "round";
    lineCtx.moveTo(lastX, lastY);
    lineCtx.lineTo(e.clientX, e.clientY);
    lineCtx.stroke();
    let dist = Math.sqrt((e.clientX - lastX)**2 + (e.clientY - lastY)**2);
    distanceCounter += dist;
    if (distanceCounter > 100) { drawLight(e.clientX, e.clientY); distanceCounter = 0; }
    [lastX, lastY] = [e.clientX, e.clientY];
});
window.addEventListener("mouseup", () => isPainting = false);

// 4. 완성 버튼 클릭 시 (하나로 통합)
toolCheck.addEventListener("click", () => {
    if (isFinished) return;
    isFinished = true;

    // 브러쉬 모드 강제 종료
    isDrawingMode = false;
    isPainting = false;
    toolLight.classList.remove("active");
    lightCanvas.style.pointerEvents = "none";

    // UI 변경
    document.querySelector(".toolbar").style.display = "none"; 
    imageSave.style.display = "block"; // 버튼 보이기
    setTimeout(() => imageSave.classList.add("show"), 10);

    // 이미지 편집 기능 차단
    document.querySelectorAll(".img_container").forEach(c => {
        c.querySelector(".btn_delete")?.remove();
        c.querySelector(".resizer")?.remove();
        c.style.pointerEvents = "none";
    });

    startTwinkle();
});

// 5. GIF 저장 로직
imageSave.addEventListener("click", (e) => {
    e.preventDefault();
    generateGif();
});

function generateGif() {
    // 1. 배경 이미지 미리 로드하기
    const bgImg = new Image();
    bgImg.src = "image/background.jpg"; 

    // 로딩 메시지
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = "배경 불러오는 중...";
    loadingMessage.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; font-size: 18px; z-index: 10000;`;
    document.body.appendChild(loadingMessage);

    bgImg.onload = () => {
        loadingMessage.textContent = "나만의 트리 저장 중... (약 3~5초 소요)";
        
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: window.innerWidth,
            height: window.innerHeight,
            workerScript: "gif.worker.js" 
        });

        const GIF_FPS = 30;
        const GIF_DURATION = 3;
        let frameCount = GIF_FPS * GIF_DURATION;
        let currentFrame = 0;

        const captureFrame = () => {
            if (currentFrame >= frameCount) {
                gif.render();
                return;
            }

            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = window.innerWidth;
            combinedCanvas.height = window.innerHeight;
            const combinedCtx = combinedCanvas.getContext('2d');

            // --- [수정된 배경 그리기 부분] ---
            // 1-1. 배경을 일단 흰색으로 채움 (투명도 대비)
            combinedCtx.fillStyle = "white";
            combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

            // 1-2. 배경 이미지 그리기 (CSS의 background-size: cover 구현)
            const canvasRatio = combinedCanvas.width / combinedCanvas.height;
            const imgRatio = bgImg.width / bgImg.height;
            let drawWidth, drawHeight, drawX, drawY;

            if (canvasRatio > imgRatio) {
                drawWidth = combinedCanvas.width;
                drawHeight = combinedCanvas.width / imgRatio;
                drawX = 0;
                drawY = (combinedCanvas.height - drawHeight) / 2;
            } else {
                drawWidth = combinedCanvas.height * imgRatio;
                drawHeight = combinedCanvas.height;
                drawX = (combinedCanvas.width - drawWidth) / 2;
                drawY = 0;
            }

            combinedCtx.globalAlpha = 0.6; // CSS의 opacity: 60% 적용
            combinedCtx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
            combinedCtx.globalAlpha = 1.0; // 다시 불투명도 복구
            // ---------------------------------

            // 2. 트리 그리기
            const treeImg = document.querySelector('.tree');
            if (treeImg) {
                combinedCtx.drawImage(treeImg, treeImg.offsetLeft, treeImg.offsetTop, treeImg.offsetWidth, treeImg.offsetHeight);
            }

            // 3. 오너먼트 그리기
            document.querySelectorAll('.img_container img').forEach(img => {
                const container = img.parentElement;
                combinedCtx.drawImage(img, container.offsetLeft, container.offsetTop, container.offsetWidth, container.offsetHeight);
            });

            // 4. 선 및 조명 합치기
            combinedCtx.drawImage(lineCanvas, 0, 0);
            combinedCtx.drawImage(lightCanvas, 0, 0);

            gif.addFrame(combinedCtx, { delay: 100, copy: true });
            currentFrame++;
            setTimeout(captureFrame, 100);
        };

        gif.on('finished', function(blob) {
            document.body.removeChild(loadingMessage);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'my_christmas_tree.gif';
            link.click();
            URL.revokeObjectURL(url);
        });

        captureFrame();
    };
}

function startTwinkle() {
    function animate() {
        if (!isFinished) return;
        lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
        time += 0.05; 
        lightPoints.forEach(pt => {
            let breathing = (Math.sin(time) + 1) / 2; 
            let opacity = breathing < 0.1 ? 0 : breathing;
            lightCtx.save();
            lightCtx.beginPath();
            lightCtx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
            lightCtx.shadowBlur = breathing * 40;
            lightCtx.shadowColor = "#FFFB00";
            lightCtx.fillStyle = `rgba(255, 251, 0, ${opacity})`; 
            lightCtx.fill();
            lightCtx.restore();
        });
        requestAnimationFrame(animate);
    }
    animate();
}