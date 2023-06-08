let gl; // The webgl context.
let surface; // surface model
let shaderProgram; // shader program
let rotateBall; // object for rotate the view by mouse.
let magnit;
let bg_surface;
let stereoCamera;
let videoTexture, imageTexture;

function numToRad(angle) {
  return (angle * Math.PI) / 180;
}

const R = 1;
const m = 1;
const n = 1;

const x = (r, B) => r * Math.cos(B);
const y = (r, B) => r * Math.sin(B);
const z = (r) => m * Math.cos((n * Math.PI * r) / R);

function sphereSurfaceDate(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}

let position = 0.0;

// initialize Model
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iVertexTextureBuffer = gl.createBuffer();
  this.count = 0;
  this.textureCount = 0;

  this.BufferData = function(vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  };

  this.TextureBufferData = function(vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.textureCount = vertices.length / 2;
  };

  this.Draw = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(
      shaderProgram.iAttribVertex,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
    gl.vertexAttribPointer(
      shaderProgram.iAttribVertexTexture,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.iAttribVertexTexture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };

  this.DrawSphere = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(
      shaderProgram.iAttribVertex,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.iAttribVertex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribVertexTexture = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  this.iTMU = -1;
  this.iUserPoint = -1;
  this.iMagnit = 1;
  this.iTranslateSphere = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  };
}

function onPerspectiveChange() {
  let h3s = document.getElementsByClassName("num");
  let eyeSep = 0.1;
  eyeSep = document.getElementById("eye").value;
  stereoCamera.mEyeSeparation = eyeSep;
  h3s[0].innerHTML = eyeSep;
  let fov = 1.56;
  fov = document.getElementById("fov").value;
  h3s[1].innerHTML = fov;
  stereoCamera.mFOV = fov;
  let nearClip = 5.0;
  nearClip = document.getElementById("near").value - 0.0;
  h3s[2].innerHTML = nearClip;
  stereoCamera.mNearClippingDistance = nearClip
  let convergence = 2000.0;
  convergence = document.getElementById("conv").value;
  h3s[3].innerHTML = convergence;
  stereoCamera.mConvergence = convergence
}

// Draws a colored cube, along with a set of coordinate axes.
let matAccel1
let matAccel2
let matAccel

function draw() {
  onPerspectiveChange();
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.orthographic(-4, 4, -4, 4, stereoCamera.mNearClippingDistance, 4 * 4);

  /* Get the view matrix from the SimpleRotator object.*/
  defineAccelMat()
  // let modelView = m4.multiply(rotateBall.getViewMatrix(), matAccel);
  let modelView = rotateBall.getViewMatrix();
  let modelView_bg = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum0_bg = m4.multiply(rotateToPointZero, modelView_bg);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  let matAccum1_bg = m4.multiply(translateToPointZero, matAccum0_bg);

  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);
  let modelViewProjection_bg = m4.multiply(projection, matAccum1_bg);

  gl.uniformMatrix4fv(
    shaderProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection_bg
  );

  gl.uniform1i(shaderProgram.iTMU, 0);
  gl.enable(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    video
  );
  gl.uniform1f(shaderProgram.iB, 1);
  gl.uniform3fv(shaderProgram.iTranslateSphere, [-5, -5, -0]);
  bg_surface.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);
  stereoCamera.ApplyLeftFrustum();
  gl.uniformMatrix4fv(
    shaderProgram.iModelViewProjectionMatrix,
    false,
    // modelViewProjection
    m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView))
  );

  gl.uniform2fv(shaderProgram.iUserPoint, [userPoint.x, userPoint.y]);
  gl.uniform1f(shaderProgram.iMagnit, magnit);
  gl.uniform1f(shaderProgram.iB, -1);

  gl.uniform3fv(shaderProgram.iTranslateSphere, [-0, -0, -0]);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.colorMask(true, false, false, false);
  surface.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);
  stereoCamera.ApplyRightFrustum();
  gl.uniformMatrix4fv(
    shaderProgram.iModelViewProjectionMatrix,
    false,
    // modelViewProjection
    m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView))
  );
  gl.colorMask(false, true, true, false);
  surface.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.colorMask(true, true, true, true);
  // let translate = Sinus(
  //   map(userPoint.x, 0, 1, 0, 5),
  //   map(userPoint.y, 0, 1, 0, Math.PI * 2)
  // );
  let translate = [0.5 * sensor.x, 0.5 * sensor.y, (-0.5) * sensor.z]
  if (panner) {
    panner.setPosition(translate[0],
      translate[1],
      translate[2])
  }
  gl.uniform3fv(shaderProgram.iTranslateSphere, [
    translate[0],
    translate[1],
    translate[2],
  ]);
  gl.uniform1f(shaderProgram.iB, 1);
  sphere.DrawSphere();

}

function constantUpdate() {
  draw();
  window.requestAnimationFrame(constantUpdate)
}

function CreateSurfaceData() {
  let vertexList = [];
  const step = 0.05;
  for (let i = 0; i < 5; i += step) {
    for (let j = 0; j < Math.PI * 2; j += step) {
      let v1 = Sinus(i, j);
      let v2 = Sinus(i + step, j);
      let v3 = Sinus(i, j + step);
      let v4 = Sinus(i + step, j + step);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
    }
  }

  return vertexList;
}

function defineAccelMat() {
  matAccel1 = m4.axisRotation([1, 0, 0], 0.5 * Math.PI * a.y * 0.1)
  matAccel2 = m4.axisRotation([0, 1, 0], -0.5 * Math.PI * a.x * 0.1)
  matAccel = m4.multiply(matAccel1, matAccel2);
}
/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shaderProgram = new ShaderProgram("Basic", prog);
  shaderProgram.Use();

  shaderProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shaderProgram.iAttribVertexTexture = gl.getAttribLocation(
    prog,
    "vertexTexture"
  );
  shaderProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shaderProgram.iTMU = gl.getUniformLocation(prog, "TMU");
  shaderProgram.iUserPoint = gl.getUniformLocation(prog, "userPoint");
  shaderProgram.iMagnit = gl.getUniformLocation(prog, "magnit");
  shaderProgram.iTranslateSphere = gl.getUniformLocation(
    prog,
    "translateSphere"
  );
  shaderProgram.iB = gl.getUniformLocation(prog, "b");
  video = document.createElement('video');
  video.setAttribute('autoplay', true);
  window.vid = video;
  LoadTexture();
  getWebcam();
  CreateWebCamTexture();
  surface = new Model("Surface");
  surface.BufferData(CreateSurfaceData());
  surface.TextureBufferData(CreateSurfaceTextureData());
  sphere = new Model("Sphere");
  sphere.BufferData(CreateSphereSurface());

  bg_surface = new Model("Background");
  bg_surface.BufferData([0, 0, 0, 10, 0, 0, 10, 10, 0, 10, 10, 0, 0, 10, 0, 0, 0, 0]);
  bg_surface.TextureBufferData([0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1])

  stereoCamera = new StereoCamera(30, 0.1, 1, 1.56, 5, 100)


  gl.enable(gl.DEPTH_TEST);
}

let video, track;

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function(stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function(e) {
    console.error('Rejected!', e);
  });
}

function CreateWebCamTexture() {
  videoTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function StereoCamera(
  Convergence,
  EyeSeparation,
  AspectRatio,
  FOV,
  NearClippingDistance,
  FarClippingDistance
) {
  this.mConvergence = Convergence;
  this.mEyeSeparation = EyeSeparation;
  this.mAspectRatio = AspectRatio;
  this.mFOV = FOV;
  this.mNearClippingDistance = NearClippingDistance;
  this.mFarClippingDistance = FarClippingDistance;

  this.mProjectionMatrix = null;
  this.mModelViewMatrix = null;

  this.ApplyLeftFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-b * this.mNearClippingDistance) / this.mConvergence;
    right = (c * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.orthographic(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to right
    this.mModelViewMatrix = m4.translation(
      this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.ApplyRightFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-c * this.mNearClippingDistance) / this.mConvergence;
    right = (b * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.orthographic(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to left
    this.mModelViewMatrix = m4.translation(
      -this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };
}

function LoadTexture() {
  imageTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const image = new Image();
  image.crossOrigin = "anonymus";

  image.src =
    "https://raw.githubusercontent.com/denisosadchyi1/WebGL/CGW/background.jpg";
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    draw();
  };
}

function CreateSphereSurface(r = 0.6) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sphereSurfaceDate(r, lon, lat);
      let v2 = sphereSurfaceDate(r, lon + 0.5, lat);
      let v3 = sphereSurfaceDate(r, lon, lat + 0.5);
      let v4 = sphereSurfaceDate(r, lon + 0.5, lat + 0.5);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
      lat += 0.5;
    }
    lat = -Math.PI * 0.5;
    lon += 0.5;
  }
  return vertexList;
}

function CreateSurfaceTextureData() {
  let vertexList = [];
  const step = 0.05;
  for (let i = 0; i < 5; i += step) {
    for (let j = 0; j < Math.PI * 2; j += step) {
      let u = map(i, 0, 5, 0, 1);
      let v = map(j, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + step, 0, 5, 0, 1);
      vertexList.push(u, v);
      u = map(i, 0, 5, 0, 1);
      v = map(j + step, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + step, 0, 5, 0, 1);
      v = map(j, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      v = map(j + step, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i, 0, 5, 0, 1);
      v = map(j + step, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
    }
  }
  return vertexList;
}

function CreateSurfaceTextureData() {
  let vertexList = [];
  const step = 0.05;
  for (let i = 0; i < 5; i += step) {
    for (let j = 0; j < Math.PI * 2; j += step) {
      let u = map(i, 0, 5, 0, 1);
      let v = map(j, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + step, 0, 5, 0, 1);
      vertexList.push(u, v);
      u = map(i, 0, 5, 0, 1);
      v = map(j + step, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + step, 0, 5, 0, 1);
      v = map(j, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      v = map(j + step, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i, 0, 5, 0, 1);
      v = map(j + step, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
    }
  }
  return vertexList;
}

function map(val, f1, t1, f2, t2) {
  let m;
  m = ((val - f1) * (t2 - f2)) / (t1 - f1) + f2;
  return Math.min(Math.max(m, f2), t2);
}

function Sinus(r, b) {
  const a = 1;
  const rr = 0.55;
  const n = 1;
  let x = r * Math.cos(b);
  let y = r * Math.sin(b);
  let z = a * Math.sin((n * Math.PI * r) / rr);
  return { x: 0.55 * x, y: 0.55 * y, z: 0.55 * z };
}

/* Creates a program for use in the WebGL context gl */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  userPoint = { x: 0.5, y: 0.5 };
  magnit = 1.0;
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    startReading()
    if (!gl) {
      // Check condition support WebGL
      throw "Your browser does not support WebGL, pls check version of your browser and support WebGL";
    }
  } catch (e) {
    console.log(e, "error loading webgl");
    document.getElementById("canvas-holder").innerHTML =
      "<p>Could'nt get a WebGL context :(</p>";
    return;
  }
  try {
    initGL(); // Check condition initialize the WebGL context
  }
  catch (e) {
    console.log(e, "error loading webgl");
    document.getElementById("canvas-holder").innerHTML =
      "<p>Could'nt initialize the WebGL context :( </p>";
    return;
  }

  rotateBall = new TrackballRotator(canvas, draw, 0);

  draw();
  constantUpdate()
}

const lightCoordinates = () => {
  let coord = Math.sin(position) * 1.1;
  return [coord, -2, coord * coord];
};

const handleChangeLeft = () => {
  position -= 0.07;
  reDraw();
};

const handleChangeRight = () => {
  position += 0.07;
  reDraw();
};

const reDraw = () => {
  surface.BufferData(CreateSurfaceData());
  draw();
};
let sensor;
let a = {
  x: 0.0,
  y: 0.0,
  z: 0.0
};
function startReading() {
  sensor = new Accelerometer({ frequency: 60 });
  sensor.addEventListener("reading", () => {
    a.x = sensor.x
    a.y = sensor.y
    a.z = sensor.z
  });
  sensor.start();
}

let audio = null;
let audioContext;
let source;
let panner;
let filter;

function initializeAudio() {
  audio = document.getElementById('audio');

  audio.addEventListener('play', handlePlay);

  audio.addEventListener('pause', handlePause);
}

function handlePlay() {
  console.log('play');
  if (!audioContext) {
    audioContext = new AudioContext();
    source = audioContext.createMediaElementSource(audio);
    panner = audioContext.createPanner();
    filter = audioContext.createBiquadFilter();

    // Connect audio nodes
    source.connect(panner);
    panner.connect(filter);
    filter.connect(audioContext.destination);

    // Set filter parameters
    filter.type = 'peaking';
    filter.Q.value = 2;
    filter.frequency.value = 500;
    filter.gain.value = 20;

    audioContext.resume();
  }
}

function handlePause() {
  console.log('pause');
  audioContext.resume();
}

function toggleFilter() {
  let filterCheckbox = document.getElementById('filterCheckbox');
  if (filterCheckbox.checked) {
    // Connect filter when checkbox is checked
    panner.disconnect();
    panner.connect(filter);
    filter.connect(audioContext.destination);
  } else {
    // Disconnect filter when checkbox is unchecked
    panner.disconnect();
    panner.connect(audioContext.destination);
  }
}

function startAudio() {
  initializeAudio();

  let filterCheckbox = document.getElementById('filterCheckbox');
  filterCheckbox.addEventListener('change', toggleFilter);

  audio.play();
}
