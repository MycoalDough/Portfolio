function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnCloud() {
    var cloud = document.createElement("img");
    cloud.src = "images/cloud" + Math.floor(Math.random() * 4) + ".png"; 
    cloud.classList.add("cloud");

    cloud.style.left = "-100px";
    cloud.style.top = getRandomNumber(0, window.innerHeight - 200) + "px";
    cloud.style.opacity = "0.5"; 
    
    var size = getRandomNumber(50, 150);
    cloud.style.width = size + "px";
    cloud.style.height = "auto";
    
    document.body.appendChild(cloud);

    // Animation
    var speed = getRandomNumber(20, 100); 
    var endPosition = window.innerWidth + 100;
    var interval = setInterval(function() {
        var currentPosition = parseFloat(cloud.style.left);
        if (currentPosition >= endPosition) {
            clearInterval(interval); 
            cloud.remove();
        } else {
            cloud.style.left = currentPosition + speed / 60 + "px"; 
        }
    }, 1000 / 60);
}

setInterval(spawnCloud, getRandomNumber(2000,15000));
