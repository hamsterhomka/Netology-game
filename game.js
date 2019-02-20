'use strict';

class Vector {
    constructor(x = 0,y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {
        if(!(vector instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        } else {
            return new Vector(this.x + vector.x,this.y + vector.y);
        }
    }

    times(amount) {
        return new Vector(this.x * amount,this.y * amount);
    }
}

class Actor {
    constructor(pos = new Vector(0,0),size = new Vector(1,1),speed = new Vector(0,0)) {
        if(!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error('Классу Actor можно задавать аргументы только типа Vector');
        } else {
            this.pos = pos;
            this.size = size;
            this.speed = speed;
        }
    }

    act() {

    }

    get type() {
        return 'actor';
    }

    get top() {
        return this.pos.y;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    get left() {
        return this.pos.x;
    }

    isIntersect(actor) {
        if(!actor) {
            throw new Error('Объект должен быть не пустым');
        } else if(!(actor instanceof Actor)) {
            throw new Error('Объект должен являться экземпляром класса Actor');
        } else if(actor === this) {
            return false
        } else {
            return this !== actor &&
            this.right > actor.left &&
            this.left < actor.right &&
            this.bottom > actor.top &&
            this.top < actor.bottom;
        }
    }
}

class Level {
    constructor(grid = [],actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.status = null;
        this.finishDelay = 1;
        this._height = grid.length;
        this._width = this.getWidth();
        this._player = this.getPlayer();
    }

    get height() {
        return this._height;
    }

    get width() {
        return this._width;
    }

    get player() {
        return this._player;
    }

    getWidth() {
        return this.grid.reduce((acc,row) => {
            if(row.length > acc) {
                acc = row.length;
            }
            return acc
        }, 0);
    }

    getPlayer() {
        return this.actors.find(actor => {
            if(actor.type === 'player') {
                return true
            }
        });
    }

    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }

    actorAt(actor) {
        if(!actor) {
            throw new Error('Объект должен быть не пустым');
        } else if(!(actor instanceof Actor)) {
            throw new Error('Объект должен являться экземпляром класса Actor');
        } else {
            let intersectedActor = undefined;

            this.actors.forEach(levelActor => {
                if(levelActor.isIntersect(actor)) {
                    intersectedActor = levelActor;
                }
            });

            return intersectedActor;
        }
    }

    obstacleAt(pos,size) {
        if(!(pos instanceof Vector)) {
            throw new Error('Положение должно быть экземпляром класса Vector');
        } else if(!(size instanceof Vector)) {
            throw new Error('Размер должен быть экземпляром класса Vector');
        } else {
            let yStart = Math.ceil(pos.y + size.y);
            let yEnd = Math.floor(pos.y);
            let xStart = Math.floor(pos.x);
            let xEnd = Math.ceil(pos.x + size.x);

            if(yStart > this.height) {
                return 'lava';
            }

            if(xStart < 0 || xEnd > this.width || yEnd < 0) {
                return 'wall';
            }

            for(let y = yEnd; y < yStart; y++) {
                for(let x = xStart; x < xEnd; x++) {
                    let objectInGrid = this.grid[y][x];

                    if(objectInGrid) return objectInGrid;
                }
            }
        }
    }

    removeActor(actor) {
        let actorIndex = this.actors.findIndex((levelActor) => {
            return levelActor === actor;
        });

        this.actors.splice(actorIndex,1);
    }

    noMoreActors(type) {
        return this.actors.every(actor => {
            return actor.type !== type;
        })
    }

    playerTouched(objectType,actor) {
        if(this.status === null) {
            if(objectType === 'lava' || objectType === 'fireball') {
                this.status = 'lost';
            } else if(objectType === 'coin' && actor) {
                this.removeActor(actor);

                if(this.noMoreActors('coin')) {
                    this.status = 'won';
                }
            }
        }
    }
}

class LevelParser {
    constructor(actorsDict = Object.create(null)) {
        this.actorsDict = actorsDict;
        this.obstaclesMap = {
            'x': 'wall',
            '!': 'lava'
        };
    }

    actorFromSymbol(symbol) {
        return symbol ? this.actorsDict[symbol] : undefined;
    }

    obstacleFromSymbol(symbol) {
        return symbol ? this.obstaclesMap[symbol] : undefined;
    }

    createGrid(plan) {
        return plan.map(row => {
            const gridRow = [];
            for(let i = 0; i < row.length; i++) {
                gridRow.push(this.obstacleFromSymbol(row.charAt(i)));
            }

            return gridRow;
        });
    }

    createActors(plan) {
        const actorsArr = [];

        for(let y = 0; y < plan.length; y++) {
            for(let x = 0; x < plan[y].length; x++) {
                let symbol = plan[y].charAt(x);
                let objectConstructor = this.actorsDict[symbol];

                if(typeof objectConstructor === 'function' ) {
                    let object = new objectConstructor(new Vector(x,y));
                    if(object instanceof Actor)  {
                        actorsArr.push(object);
                    }
                }
            }
        }

        return actorsArr;
    }

    parse(plan) {
        return new Level(this.createGrid(plan),this.createActors(plan));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0,0),speed = new Vector(0,0)) {
        super(pos,new Vector(1,1),speed);
    }

    get type() {
        return 'fireball'
    }

    getNextPosition(time = 1) {
        return new Vector(this.pos.x,this.pos.y).plus(new Vector(this.speed.x * time,this.speed.y * time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time,level) {
        let nextPosition = this.getNextPosition(time);

        if(!level.obstacleAt(nextPosition,this.size)) {
            this.pos = nextPosition;
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball{
    constructor(pos) {
        super(pos,new Vector(2,0));
    }
}

class VerticalFireball extends Fireball{
    constructor(pos) {
        super(pos,new Vector(0,2));
    }
}

class FireRain extends Fireball{
    constructor(pos) {
        super(pos,new Vector(0,3));
        this.initialPos = pos;
    }

    handleObstacle() {
        this.pos = this.initialPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0,0)) {
        const posPlus = pos.plus(new Vector(0.2,0.1));
        super(posPlus,new Vector(0.6,0.6));

        this.initialPos = posPlus;
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0,Math.sin(this.spring) * this.springDist)
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.initialPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0,0)) {
        const posPlus = pos.plus(new Vector(0,-0.5));
        super(posPlus,new Vector(0.8,1.5));
    }

    get type() {
        return 'player';
    }
}

const schemas = [
    [
        '         ',
        '         ',
        '    =    ',
        '       o ',
        '     !xxx',
        ' @       ',
        'xxx!     ',
        '         '
    ],
    [
        '      v  ',
        '         ',
        '  v      ',
        '        o',
        '        x',
        '@   x    ',
        'x        ',
        '         '
    ]
];
const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin
};
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
    .then(() => alert('Вы победили!'));