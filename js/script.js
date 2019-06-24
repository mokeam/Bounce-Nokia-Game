// Lives
var lives = 3;

// Scores
var score = 0;

var game_audio = new Audio('./extra/rock.mp3');
var obstacle_audio = new Audio('./extra/obstacle.mp3');
var pillet_audio = new Audio('./extra/pillet.mp3');
var mute = false;
var gameState;

// Box2DWeb Dynamics
var box2DVec2         = Box2D.Common.Math.b2Vec2;
var box2DWorld        = Box2D.Dynamics.b2World;
var box2DBodyDef      = Box2D.Dynamics.b2BodyDef;
var box2DBody         = Box2D.Dynamics.b2Body;
var box2DFixtureDef   = Box2D.Dynamics.b2FixtureDef;
var box2DPolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var box2DCircleShape  = Box2D.Collision.Shapes.b2CircleShape;

// Box2D world variables
var newWorld         = undefined;
var newBall          = undefined;

function createDynamicWorld() {
    // Create the world object.
    newWorld = new box2DWorld(new box2DVec2(0, 0), true);

    // Create the ball.
    var newBodyDefinition = new box2DBodyDef();
    newBodyDefinition.type = box2DBody.b2_dynamicBody;
    newBodyDefinition.position.Set(1, 1);
    newBall = newWorld.CreateBody(newBodyDefinition);
    var newFixtureDefinition = new box2DFixtureDef();
    newFixtureDefinition.density = 1.0;
    newFixtureDefinition.friction = 0.0;
    newFixtureDefinition.restitution = 0.25;
    newFixtureDefinition.shape = new box2DCircleShape(ballRadius);
    newBall.CreateFixture(newFixtureDefinition);

    // Create the maze.
    newBodyDefinition.type = box2DBody.b2_staticBody;
    newFixtureDefinition.shape = new box2DPolygonShape();
    newFixtureDefinition.shape.SetAsBox(0.5, 0.5);
    for (var i = 0; i < maze.dimension; i++) {
        for (var j = 0; j < maze.dimension; j++) {
            if (maze[i][j]) {
                newBodyDefinition.position.x = i;
                newBodyDefinition.position.y = j;
                newWorld.CreateBody(newBodyDefinition).CreateFixture(newFixtureDefinition);
            }
        }
    }

}

var ballTexture    = THREE.ImageUtils.loadTexture('./img/ball.png');
var obstacleTexture= THREE.ImageUtils.loadTexture('./img/obstacle.png');
var planeTexture   = THREE.ImageUtils.loadTexture('./img/wall2.jpg');
var meshTexture   = THREE.ImageUtils.loadTexture('./img/wall.png');
var pilletTexture   = THREE.ImageUtils.loadTexture('./img/pillet.jpg');
var exitTexture    = THREE.ImageUtils.loadTexture('./img/exit.png');

function generate_maze_mesh(field) {
    var emptyGeometry = new THREE.Geometry();
    for (var i = 0; i < field.dimension; i++) {
        for (var j = 0; j < field.dimension; j++) {
            if (field[i][j]) {
                var cubeGeometry = new THREE.CubeGeometry(1,1,1,1,1,1);
                var cubeMesh_ij = new THREE.Mesh(cubeGeometry);
                cubeMesh_ij.position.z = 0.5;
                cubeMesh_ij.position.y = j;
                cubeMesh_ij.position.x = i;
                THREE.GeometryUtils.merge(emptyGeometry, cubeMesh_ij);
            }
        }
    }
    var material = new THREE.MeshPhongMaterial({map: meshTexture});
    var mesh = new THREE.Mesh(emptyGeometry, material)
    return mesh;
}

var camera;
var scene;
var renderer;
var light;

// Model Mesh Declarations
var maze;
var mazeMesh;
var mazeDimension  = 11;
var planeMesh;
var ballMesh;

// Model Radius Desclaration
var obstacleRadius = 0.25;
var pilletRadius = 0.25;
var ballRadius     = 0.10;
var exitRadius     = 0.25;

var animationAxis        = [0, 0];
var obstacleLocation = undefined;
var pilletLocation = undefined;
var obstacleMovementLimit = undefined;
var flag;
var exit_angle = 0;
var exit_opacity = 1;



function createSceneRenderWorld() {

    // Create the scene object.
    scene = new THREE.Scene();

    // Add the light.
    light= new THREE.PointLight(0xffffff, 1);
    light.position.set(1, 1, 1.3);
    scene.add(light);

    // Add the Ball Mesh.
    g = new THREE.SphereGeometry(ballRadius, 32, 16);
    m = new THREE.MeshPhongMaterial({map:ballTexture});
    ballMesh = new THREE.Mesh(g, m);
    ballMesh.position.set(1, 1, ballRadius);
    scene.add(ballMesh);

    // Add the Obstacle Mesh
    addObstacle();
    obstacleTranslation();
    flag = Array(obstacleLocation.length/2)
    for(i=0;i<flag.length;i++)
      flag[i]=true


    //Addition of Pillet Mesh
    var level = Math.floor((mazeDimension-1)/2 - 4);
    if(level%2==0)
        addPillets(level/2);
    else
        pilletLocation=undefined;

    //Adding the Exit Mesh
    exitGeometry = new THREE.CubeGeometry(0.5,0.5,0.5,1,0,1);
    exitMeshPhong = new THREE.MeshBasicMaterial({map:exitTexture});
    exitMesh = new THREE.Mesh(exitGeometry,exitMeshPhong);
    exitMesh.position.set(mazeDimension,mazeDimension-2,exitRadius);
    exitMesh.rotation.set(Math.PI/2, 0, 0);
    scene.add(exitMesh)

    // Adding the Camera.
    var aspect = window.innerWidth/window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
    camera.position.set(1, 1, 5);
    scene.add(camera);

    // Adding the Maze Mesh.
    mazeMesh = generate_maze_mesh(maze);
    scene.add(mazeMesh);

    // Adding the Plane Mesh.
    g = new THREE.PlaneGeometry(mazeDimension*10, mazeDimension*10, mazeDimension, mazeDimension);
    planeTexture.wrapS = planeTexture.wrapT = THREE.RepeatWrapping;
    planeTexture.repeat.set(mazeDimension*5, mazeDimension*5);
    m = new THREE.MeshPhongMaterial({map:planeTexture});
    planeMesh = new THREE.Mesh(g, m);
    planeMesh.position.set((mazeDimension-1)/2, (mazeDimension-1)/2, 0);
    planeMesh.rotation.set(Math.PI/2, 0, 0);
    scene.add(planeMesh);

}

function updateDynamicWorld() {

    // Applying Friction to the ball
    var velocity = newBall.GetLinearVelocity();
    velocity.Multiply(0.95);
    newBall.SetLinearVelocity(velocity);

    // Applying Force to the ball controlled by User
    var force = new box2DVec2(animationAxis[0]*newBall.GetMass()*0.25, animationAxis[1]*newBall.GetMass()*0.25);
    newBall.ApplyImpulse(force, newBall.GetPosition());
    animationAxis = [0,0];

    // Taking a time step.
    newWorld.Step(1/60, 8, 3);
    animatingObstacle()
}

function updateSceneRenderWorld() {
    // Updating Ball position.
    var xIncrement = newBall.GetPosition().x - ballMesh.position.x;
    var yIncrement = newBall.GetPosition().y - ballMesh.position.y;

    ballMesh.position.x += xIncrement;
    ballMesh.position.y += yIncrement;
    actualBallPosX = Math.round(ballMesh.position.x*100)/100
    actualBallPosY = Math.round(ballMesh.position.y*100)/100

    // Updating Lives and Score
    checkBallCollisionWithObjects(actualBallPosX,actualBallPosY);

    if (lives == 0) {
        $('#gameover').show()
        $('#try').show()
        $('#totalscore').html('Total Score: ' + score).show();
        $('html, body').css({
            overflow: 'hidden',
            height: '100%',
        });
        scene.remove(planeMesh);
        scene.remove(light);
        scene.remove(ballMesh);
        scene.remove(exitMesh);
        scene.remove(mazeMesh);
        scene.remove(camera);
    }

    // Updating Ball rotation.
    var tempMat = new THREE.Matrix4();
    tempMat.makeRotationAxis(new THREE.Vector3(0,1,0), xIncrement/ballRadius);
    tempMat.multiplySelf(ballMesh.matrix);
    ballMesh.matrix = tempMat;
    tempMat = new THREE.Matrix4();
    tempMat.makeRotationAxis(new THREE.Vector3(1,0,0), -yIncrement/ballRadius);
    tempMat.multiplySelf(ballMesh.matrix);
    ballMesh.matrix = tempMat;
    ballMesh.rotation.getRotationFromMatrix(ballMesh.matrix);

    // Updating Camera Position and Light Position.
    camera.position.x += (ballMesh.position.x - camera.position.x) * 0.1;
    camera.position.y += (ballMesh.position.y - camera.position.y) * 0.1;
    camera.position.z += (5 - camera.position.z) * 0.1;
    light.position.x = camera.position.x;
    light.position.y = camera.position.y;
    light.position.z = camera.position.z - 3.7;
}

function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
}

function onMoveKey(axis) {
    game_audio.play();
    game_audio.volume = 0.3;
    animationAxis = axis.slice(0);
}

function play_audio(audio) {
  audio.play();
}
function stop_audio(audio){
    audio.stop();
}

$('#mute_button').click(function(){
  mute = !mute
  if (mute == true) {
    $('#show_volume').hide();
    $('#show_mute').show();
    mutePage()
  }
  else {
    unmutePage()
    $('#show_volume').show();
    $('#show_mute').hide();
  }
})

// mute all video and audio elements on the page
function mutePage() {
    var elems = [game_audio, obstacle_audio, pillet_audio];
    [].forEach.call(elems, function(elem) { elem.muted = true; elem.pause(); });
};

function unmutePage() {
    var elems = [game_audio, obstacle_audio, pillet_audio];
    [].forEach.call(elems, function(elem) { elem.muted = false; });
};

jQuery.fn.centerv = function () {
    wh = window.innerHeight;
    h = this.outerHeight();
    this.css("position", "absolute");
    this.css("top", Math.max(0, (wh - h)/2) + "px");
    return this;
}

jQuery.fn.centerh = function () {
    ww = window.innerWidth;
    w = this.outerWidth();
    this.css("position", "absolute");
    this.css("left", Math.max(0, (ww - w)/2) + "px");
    return this;
}

jQuery.fn.center = function () {
    this.centerv();
    this.centerh();
    return this;
}

function initializeGame(){
    maze = createMaze(mazeDimension);
    maze[mazeDimension-1][mazeDimension-2] = false;
    createDynamicWorld();
    createSceneRenderWorld();
    camera.position.set(1, 1, 5);
    light.position.set(1, 1, 1.3);
    light.intensity = 0;
    var level = Math.floor((mazeDimension-1)/2 - 4);
    $('#level').html('Level: ' + level);
    $('#lives').html('Lives: ' + lives);
    $('#score').html('Score: ' + score);
    gameState = 'setup';
}

function setupGameScene(){
    light.intensity += 0.1 * (1.0 - light.intensity);
    renderer.render(scene, camera);
    if (Math.abs(light.intensity - 1.0) < 0.05) {
        light.intensity = 1.0;
        gameState = 'play'
    }
}

function playGame(){
    updateDynamicWorld();
    updateSceneRenderWorld();
    renderer.render(scene, camera);

    var mazeX = Math.floor(ballMesh.position.x + 0.5);
    var mazeY = Math.floor(ballMesh.position.y + 0.5);
    if (mazeX == mazeDimension && mazeY == mazeDimension - 2) {
        mazeDimension += 2;
        score = score + 20;
        gameState = 'next';
    }
}

function nextGameLevel(){
    scene.remove(exitMesh)

    updateDynamicWorld();
    updateSceneRenderWorld();
    light.intensity += 0.07 * (0.0 - light.intensity);
    renderer.render(scene, camera);
    if (Math.abs(light.intensity - 0.0) < 0.1) {
        light.intensity = 0.0;
        renderer.render(scene, camera);
        gameState = 'initialize'
    }
}

// Game state animation
function gameAnimation() {

    if (gameState == "initialize"){
        initializeGame();
    }
    else if (gameState == "setup"){
        setupGameScene();
    }
    else if (gameState == "play"){
        playGame();
    }
    else if (gameState == "next"){
        nextGameLevel()
    }
    requestAnimationFrame(gameAnimation);
}

$(document).ready(function() {

    // Show game instructions.
    $('#instructions').center();
    $('#instructions').hide();
    KeyboardJS.bind.key('h', function(){$('#instructions').show()},
                             function(){$('#instructions').hide()});

    // Create the renderer.
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Bind keyboard and resize events.
    KeyboardJS.bind.axis('left', 'right', 'down', 'up', onMoveKey);
    KeyboardJS.bind.axis('a', 'd', 's', 'w', onMoveKey);
    KeyboardJS.bind.axis('1', '3', '2', '5', onMoveKey);
    $(window).resize(onResize);

    $('#try').click(function(){
        location.reload();
    })

    // Set the initial state of the game
    gameState = 'initialize';

    // Start game Animation.
    requestAnimationFrame(gameAnimation);
})


//Intigrating all codes of obstacle collision,pillet picking and exit fading
function checkBallCollisionWithObjects(actualBallPosX,actualBallPosY){
    collision_flag = checkCollisionWithObstacle(actualBallPosX,actualBallPosY)
    if (collision_flag){
        lives = lives - 1;
        play_audio(obstacle_audio)
        if (score >= 10){
            score = score - 5;
        }

        createDynamicWorld();
        createSceneRenderWorld();

        $('#lives').html('Lives: ' + lives);
        $('#score').html('Score: ' + score);
    }
    var level = Math.floor((mazeDimension-1)/2 - 4);
    if(pilletLocation!=undefined){
        pilletPicked = pickingPilletByBall(actualBallPosX,actualBallPosY)
        if(pilletPicked!=-1 && pilletLocation.length>-1){
            var object = scene.getChildByName("pilletMesh"+pilletPicked);
            scene.remove(object);
            pilletLocation[pilletPicked]=-1
            pilletLocation[pilletPicked+1]=-1
            score = score + 10
            play_audio(pillet_audio)
            $('#score').html('Score: ' + score);
        }
    }

    if((actualBallPosX>(mazeDimension-1.5) && (actualBallPosX < mazeDimension) )){
        exitMesh.material.opacity = exit_opacity;
        if(exit_opacity>0.2)
            exit_opacity-=0.01
    }
    else{
          exit_opacity=1
          exitMesh.material.opacity = exit_opacity;
    }
    exit_angle += 0.05
    exitMesh.rotation.set(exit_angle,0,0)
}

//Adding Obstacle to the scene
function addObstacle(){
    var totalObstacles = (Math.floor((mazeDimension-1)/2 - 4))+1;
    obstacleLocation = Array(totalObstacles*2);
    var obstLoci=0;
    while(obstLoci<(totalObstacles*2)){
        x = Math.floor(Math.random() * (mazeDimension - 1)) + 0;
        y = Math.floor(Math.random() * (mazeDimension - 1)) + 0;

        for(i=0;i<obstacleLocation.length;i++)
        {
            if((x==obstacleLocation[i] && y==obstacleLocation[i+1]) || (x==1 && y==1))
            {
                x = Math.floor(Math.random() * (+mazeDimension - 1)) + 0;
                y = Math.floor(Math.random() * (+mazeDimension - 1)) + 0;
            }

        }

        if(!maze[x][y]){
            obstacleLocation[obstLoci]=x;
            obstacleLocation[obstLoci+1]=y;
            obstLoci+=2;
        }
    }

    for( var j=0;j<(totalObstacles*2);j+=2){
        var obstacleg1 = new THREE.CubeGeometry(0.5,0.5,0.5,1,1,1);
        var obstaclem1 = new THREE.MeshPhongMaterial({map:obstacleTexture});
        obstacleMesh = new THREE.Mesh(obstacleg1, obstaclem1);
        obstacleMesh.position.set(obstacleLocation[j],obstacleLocation[j+1], obstacleRadius);
        obstacleMesh.name = "obstacleMesh"+(j+1);
        scene.add(obstacleMesh);
    }

}

// Adding of pillets to scene
function addPillets(totalPillet){
    pilletLocation = Array(totalPillet*2);
    var pilletLoci = 0;
    while(pilletLoci<(totalPillet*2)){
        x = Math.floor(Math.random() * (mazeDimension-1));
        y = Math.floor(Math.random() * (mazeDimension-1));


        if(pilletLocation.indexOf(x)>-1)
            if(y==pilletLocation[pilletLocation.indexOf(x)+1])
            {
                x = Math.floor(Math.random() * (mazeDimension-1));
                y = Math.floor(Math.random() * (mazeDimension-1));
            }
        if((obstacleLocation.indexOf(x)>-1 && y==obstacleLocation[obstacleLocation.indexOf(x)]) || (x==1 && y==1))
            {
                x = Math.floor(Math.random() * (mazeDimension-1));
                y = Math.floor(Math.random() * (mazeDimension-1));
            }


        if(!maze[x][y]){
            pilletLocation[pilletLoci] = x;
            pilletLocation[pilletLoci+1] = y;
            pilletLoci += 2;
        }
        else
        {
            x = Math.floor(Math.random() * (mazeDimension-1));
            y = Math.floor(Math.random() * (mazeDimension-1));
        if(!maze[x][y]){
            pilletLocation[pilletLoci] = x;
            pilletLocation[pilletLoci+1] = y;
            pilletLoci += 2;
        }

        }
    }

    for(var j=0; j<(totalPillet*2); j+=2){
        var pilletGeometry = new THREE.TorusKnotGeometry(0.08,0.05);
        var pilletMeshPhong = new THREE.MeshPhongMaterial({map:pilletTexture,});
        pilletMesh = new THREE.Mesh(pilletGeometry, pilletMeshPhong);
        pilletMesh.position.set(pilletLocation[j],pilletLocation[j+1], pilletRadius);
        pilletMesh.name = "pilletMesh"+j;
        scene.add(pilletMesh);
    }

}

//Collision Detection of Ball with Obstacle
function checkCollisionWithObstacle(ball_Pos_X,ball_Pos_Y){
    if (obstacleLocation.length<=0)
        return false;

    for( i = 0;i<obstacleLocation.length;i+=2)
    {
        if((ball_Pos_X<=(obstacleLocation[i]+0.3) && ball_Pos_X>=(obstacleLocation[i]-0.3)   )
            &&
             (ball_Pos_Y<=(obstacleLocation[i+1]+0.3) && ball_Pos_Y>=(obstacleLocation[i+1]-0.3)))
            return true
    }
    return false;
}

//Picking of Pillet from scene
function pickingPilletByBall(ball_Pos_X,ball_Pos_Y){
    if(pilletLocation.length<=0)
        return false;

    for(i=0;i<pilletLocation.length;i+=2)
    {
        if((ball_Pos_X<=(pilletLocation[i]+0.3) && ball_Pos_X>=(pilletLocation[i]-0.3)   )
            &&
             (ball_Pos_Y<=(pilletLocation[i+1]+0.3) && ball_Pos_Y>=(pilletLocation[i+1]-0.3)))
           return i;
    }
    return -1;
}


function obstacleTranslation(){

    var obstacleObject;

    obstacleMovementLimit = new Array(obstacleLocation.length)
    for (i=0;i<obstacleLocation.length;i+=2)
    {
        //obstacleObject = scene.getChildByName("obstacleMesh"+(j+1));
        for (j=obstacleLocation[i];j<mazeDimension-1;j++)
           {
               if(maze[j][obstacleLocation[i+1]])
                break;
           }
        obstacleMovementLimit[i] = j
        for( j=obstacleLocation[i];j>0;j--)
        {
            if(maze[j][obstacleLocation[i+1]])
                break;
        }
        obstacleMovementLimit[i+1]=j
    }
}


function animatingObstacle(){

    var obstacleObject;
    var level = Math.floor((mazeDimension-1)/2 - 4);
    obstacleMovememtValue = 0.01+(level*0.01)

    for (i=0;i<obstacleLocation.length;i+=2)
    {
        obstacleObject = scene.getChildByName("obstacleMesh"+(i+1))
        current_x_position = obstacleLocation[i];
        if(flag[i] && (current_x_position <= obstacleMovementLimit[i]-0.75))
        {
            obstacleObject.translateX(obstacleMovememtValue)
            current_x_position += obstacleMovememtValue
            obstacleLocation[i] = current_x_position

        }
        else
        {
            if(current_x_position>= obstacleMovementLimit[i+1]+0.75)
            {
                obstacleObject.translateX(-obstacleMovememtValue)
                current_x_position -=obstacleMovememtValue
                obstacleLocation[i] = current_x_position
                flag[i]=false
            }
            else if( current_x_position < obstacleMovementLimit[i+1]+0.75)
                flag[i]=true


        }

    }
}
