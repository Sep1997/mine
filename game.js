KEY_CODES = {
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
}

KEY_STATUS = {};
for (code in KEY_CODES) {
  KEY_STATUS[KEY_CODES[code]] = false;
}

$(window).keydown(function (e) {
  KEY_STATUS[KEY_CODES[e.keyCode]] = true;
}).keyup(function (e) {
  KEY_STATUS[KEY_CODES[e.keyCode]] = false;
});

Array.prototype.convertToPolyline = function () {
  var pairCount = this.length/2;
  var x = new Array(pairCount);
  var y = new Array(pairCount);
  for (var i = 0; i < pairCount; i++) {
    x[i] = this[i*2];
    y[i] = this[i*2+1];
  }
  return [x, y];
};

Matrix = function (rows, columns) {
  var i, j;
  this.data = new Array(rows);
  for (i = 0; i < rows; i++) {
    this.data[i] = new Array(columns);
  }

  this.set = function () {
    var k = 0;
    for (i = 0; i < rows; i++) {
      for (j = 0; j < columns; j++) {
        this.data[i][j] = arguments[k];
        k++;
      }
    }
  }

  this.multiply = function () {
    var vector = new Array(rows);
    for (i = 0; i < rows; i++) {
      vector[i] = 0;
      for (j = 0; j < columns; j++) {
        vector[i] += this.data[i][j] * arguments[j];
      }
    }
    return vector;
  };
};

matrix = new Matrix(3, 3);

Sprite = function (canvas, points, diameter) {
  this.canvas = canvas;
  this.points = points;
  this.diameter = diameter || 1;

  this.children = {};

  this.visible = false;

  this.x     = 0;
  this.y     = 0;
  this.rot   = 0;
  this.scale = 1;

  this.vel = {
    x:   0,
    y:   0,
    rot: 0
  };

  this.acc = {
    x:   0,
    y:   0,
    rot: 0
  };

  this.preMove = null;
  this.postMove = null;

  this.run = function() {
    this.move();
    this.configureMatrix();
    this.draw();
  };

  this.move = function () {
    if (!this.visible) return;

    if ($.isFunction(this.preMove)) {
      this.preMove();
    }

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.x += this.vel.x;
    this.y += this.vel.y;
    this.rot += this.vel.rot;
    if (this.rot > 360) {
      this.rot -= 360;
    } else if (this.rot < 0) {
      this.rot += 360;
    }

    if ($.isFunction(this.postMove)) {
      this.postMove();
    }
  };

  this.configureMatrix = function () {
    if (!this.visible) return;

    var rad = (this.rot * Math.PI)/180;
    var sin = Math.sin(rad) * this.scale;
    var cos = Math.cos(rad) * this.scale;
    matrix.set(cos, -sin, this.x,
               sin,  cos, this.y,
                 0,    0,      1);
  };

  this.draw = function () {
    if (!this.visible) return;

    var ret = new Array(this.points.length);
    for (var i = 0; i < this.points.length/2; i++) {
      var xi = i*2;
      var yi = xi + 1;
      var vector = matrix.multiply(this.points[xi], this.points[yi], 1);
      ret[xi] = vector[0];
      ret[yi] = vector[1];
    }

    canvas.drawPolyline.apply(canvas, ret.convertToPolyline());

    for (child in this.children) {
      this.children[child].draw();
    }
  };

};


$(function () {
  var canvas = $("#canvas");
  var canvasWidth  = canvas.width();
  var canvasHeight = canvas.height();

  var sprites = [];

  var wrapPostMove = function () {
    var buffer = this.scale * this.diameter;
    if (this.x - buffer > canvasWidth) {
      this.x = -buffer;
    } else if (this.x + buffer < 0) {
      this.x = canvasWidth + buffer;
    }
    if (this.y - buffer > canvasHeight) {
      this.y = -buffer;
    } else if (this.y + buffer < 0) {
      this.y = canvasHeight + buffer;
    }
  }

  var ship = new Sprite(canvas, [-6,   7,
                                  0, -11,
                                  6,   7,
                                 -6,   7]);

  ship.children.exhaust = new Sprite(canvas, [-3,  6,
                                               0, 11,
                                               3,  6,
                                              -3,  6]);

  ship.x = canvasWidth / 2;
  ship.y = canvasHeight / 2;

  ship.visible = true;

  var bullet = new Sprite(canvas);

  bullet.configureMatrix = function () {};
  bullet.draw = function () {
    if (this.visible) {
      canvas.fillEllipse(this.x-1, this.y-1, 2, 2);
    }
  };
  bullet.postMove = function () {
    if (this.x >= canvasWidth || this.x <= 0 ||
        this.y >= canvasHeight || this.y <= 0) {
      this.visible = false;
    }
  };

  var asteroid = new Sprite(canvas, [-10,   0,
                                      -5,   7,
                                      -3,   4,
                                       1,  10,
                                       5,   4,
                                      10,   0,
                                       5,  -6,
                                       2, -10,
                                      -4, -10,
                                      -4,  -5,
                                     -10,   0], 20);

  asteroid.visible = true;
  asteroid.scale = 4;
  asteroid.postMove = wrapPostMove;

  sprites.push(ship);
  sprites.push(bullet);

  bullets = [bullet];
  for (var i = 0; i < 100; i++) {
    var bull = $.extend(true, {}, bullet);
    bullets.push(bull);
    sprites.push(bull);
  }

  for (var i = 0; i < 5; i++) {
    var roid = $.extend(true, {}, asteroid);
    roid.x = Math.random() * canvasWidth;
    roid.y = Math.random() * canvasHeight;
    roid.vel.x = Math.random() * 2 - 1;
    roid.vel.y = Math.random() * 2 - 1;
    if (Math.random() > 0.5) {
      roid.points.reverse();
    }
    roid.vel.rot = Math.random() * 2 - 1;
    sprites.push(roid);
  }

  var bulletCounter = 0;

  ship.preMove = function () {
    if (KEY_STATUS.left) {
      this.vel.rot = -5;
    } else if (KEY_STATUS.right) {
      this.vel.rot = 5;
    } else {
      this.vel.rot = 0;
    }

    if (KEY_STATUS.up) {
      var rad = ((this.rot-90) * Math.PI)/180;
      this.acc.x = 0.5 * Math.cos(rad);
      this.acc.y = 0.5 * Math.sin(rad);
      this.children.exhaust.visible = Math.random() > 0.1;
    } else {
      this.acc.x = 0;
      this.acc.y = 0;
      this.children.exhaust.visible = false;
    }

    if (KEY_STATUS.space) {
      bulletCounter++;
      if (bulletCounter > 5) {
        bulletCounter = 0;
        for (var i = 0; i < bullets.length; i++) {
          if (!bullets[i].visible) {
            var rad = ((this.rot-90) * Math.PI)/180;
            var vectorx = Math.cos(rad);
            var vectory = Math.sin(rad);
            // move to the nose of the ship
            bullets[i].x = this.x + vectorx * 4;
            bullets[i].y = this.y + vectory * 4;
            bullets[i].vel.x = 6 * vectorx + this.vel.x;
            bullets[i].vel.y = 6 * vectory + this.vel.y;
            bullets[i].visible = true;
            break;
          }
        }
      }
    }

    // limit the ship's speed
    if (Math.sqrt(ship.vel.x * ship.vel.x + ship.vel.y * ship.vel.y) > 8) {
      ship.vel.x *= 0.95;
      ship.vel.y *= 0.95;
    }
  };

  ship.postMove = wrapPostMove;

  var i = 0;
  var mainLoop = setInterval(function () {
    canvas.fillRect(0, 0, canvasWidth, canvasHeight, {color:'white'});

    for (i = 0; i < sprites.length; i++) {
      sprites[i].run();
    }
  }, 25);

  canvas.click(function () {
    clearInterval(mainLoop);
  });
});
