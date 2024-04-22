function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnCloud() {
    var cloud = document.createElement("img");
    cloud.src = "images/cloud" + Math.floor(Math.random() * 4) + ".png"; 
    cloud.classList.add("cloud");

    cloud.style.left = "-100px";
    cloud.style.top = getRandomNumber(0, window.innerHeight - 200) + "px";
    cloud.style.opacity = getRandomNumber(0,0.3).toString(); 
    
    var size = getRandomNumber(50, 150);
    cloud.style.width = size + "px";
    cloud.style.height = "auto";
    
    document.body.appendChild(cloud);

    // Animation
    var speed = getRandomNumber(20, 100); 
    var endPosition = window.innerWidth - 10;
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

setInterval(spawnCloud, getRandomNumber(10000,20000));

function filterProjects() {
    var checkbox1 = document.getElementById("checkbox1");
    var checkbox2 = document.getElementById("checkbox2");
    var projects = document.querySelectorAll('.project');

    if (checkbox1.checked && !checkbox2.checked) {
        projects.forEach(function(project) {
            if (project.id === "AI") {
                project.style.display = "block";
            } else {
                project.style.display = "none";
            }
        });
    } else if (!checkbox1.checked && checkbox2.checked) {
        projects.forEach(function(project) {
            if (project.id === "GAME") {
                project.style.display = "block";
            } else {
                project.style.display = "none";
            }
        });
    } else {
        projects.forEach(function(project) {
            project.style.display = "block";
        });
    }
}


const letters = "qwertyuiopasdfghjklzxcvbnm234567890!@#$%^&*()";

let interval = null;

document.getElementById("main_menu_p").addEventListener("mouseover", event => {
      let iteration = 0;
  
  clearInterval(interval);
  
  interval = setInterval(() => {
    event.target.innerText = event.target.innerText
      .split("")
      .map((letter, index) => {
        if(index < iteration) {
          return event.target.dataset.value[index];
        }
      
        return letters[Math.floor(Math.random() * 40)]
      })
      .join("");
    
    if(iteration >= event.target.dataset.value.length){ 
      clearInterval(interval);
    }
    
    iteration += 1 / 3;
  }, 1);
});