function createMaze(dimension) {
    function loop(mazeScene, xAxis, yAxis) {
        mazeScene[xAxis][yAxis] = false;

        while(true) {
            directions = [];

            if(xAxis > 1 && mazeScene[xAxis-2][yAxis] == true) {
                directions.push([-1, 0]);
            }

            if(xAxis < mazeScene.dimension - 2 && mazeScene[xAxis+2][yAxis] == true) {
                directions.push([1, 0]);
            }

            if(yAxis > 1 && mazeScene[xAxis][yAxis-2] == true) {
                directions.push([0, -1]);
            }

            if(yAxis < mazeScene.dimension - 2 && mazeScene[xAxis][yAxis+2] == true) {
                directions.push([0, 1]);
            }

            if(directions.length == 0) {
                return mazeScene;
            }
            
            allDirections = directions[Math.floor(Math.random()*directions.length)];
            mazeScene[xAxis+allDirections[0]][yAxis+allDirections[1]] = false;
            mazeScene = loop(mazeScene, xAxis+allDirections[0]*2, yAxis+allDirections[1]*2);
        }
    }
    // Initialize the mazeScene.
    var mazeScene = new Array(dimension);
    mazeScene.dimension = dimension;
    for(var x = 0; x < dimension; x++) {
        mazeScene[x] = new Array(dimension);
        for (var y = 0; y < dimension; y++) {
            mazeScene[x][y] = true;
        }
    }
    // Gnerate the maze recursively.
    mazeScene = loop(mazeScene, 1, 1);
    return mazeScene;
}