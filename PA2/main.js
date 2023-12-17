'use strict';

let webGLCont;
let surface;
let shaderProgram;
let simpleRotator;


function degreeToRad(angle) {
    return angle * Math.PI / 180;
}


function Model(name) {
    this.name = name;
    this.iVertexBuffer = webGLCont.createBuffer();
    this.iVertexBufferOfNormal = webGLCont.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBuffer);
        webGLCont.bufferData(webGLCont.ARRAY_BUFFER, new Float32Array(vertices), webGLCont.STREAM_DRAW);
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBufferOfNormal);
        webGLCont.bufferData(webGLCont.ARRAY_BUFFER, new Float32Array(normals), webGLCont.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    this.Draw = function () {
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBuffer);
        webGLCont.vertexAttribPointer(shaderProgram.iAttribVertex, 3, webGLCont.FLOAT, false, 0, 0);
        webGLCont.enableVertexAttribArray(shaderProgram.iAttribVertex);
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBufferOfNormal);
        webGLCont.vertexAttribPointer(shaderProgram.iAttribNormal, 3, webGLCont.FLOAT, false, 0, 0);
        webGLCont.enableVertexAttribArray(shaderProgram.iAttribNormal);
        webGLCont.drawArrays(webGLCont.TRIANGLES, 0, this.count)
    }
}


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        webGLCont.useProgram(this.prog);
    }
}


function draw() {
    webGLCont.clearColor(0, 0, 0, 1);
    webGLCont.clear(webGLCont.COLOR_BUFFER_BIT | webGLCont.DEPTH_BUFFER_BIT);

    const projectionTransformation = 20;
    let projection = m4.orthographic(-projectionTransformation, projectionTransformation, 
        -projectionTransformation, projectionTransformation, 
        -projectionTransformation, projectionTransformation);

    let modelView = simpleRotator.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 1], 0.6);
    let translateToPointZero = m4.translation(-1, 1.5, -17);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);

    let normMatr = m4.identity();
    m4.inverse(modelView, normMatr);
    normMatr = m4.transpose(normMatr, normMatr);
    webGLCont.uniformMatrix4fv(shaderProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    webGLCont.uniformMatrix4fv(shaderProgram.iNormalMatrix, false, normMatr);

    webGLCont.uniform4fv(shaderProgram.iColor, [0.6, 0, 0.9, 1]);
    webGLCont.uniform3fv(shaderProgram.iLightDirection, [
        parseFloat(document.getElementById('dirrectionOfLightX').value), 
        parseFloat(document.getElementById('dirrectionOfLightY').value), 
        parseFloat(document.getElementById('dirrectionOfLightZ').value)
    ]);    
    webGLCont.uniform3fv(shaderProgram.iLightPosition, [
        parseFloat(document.getElementById('positionOfLightX').value), 
        parseFloat(document.getElementById('positionOfLightY').value), 
        parseFloat(document.getElementById('positionOfLightZ').value)
    ]);

    webGLCont.uniform1f(shaderProgram.iLimit, parseFloat(document.getElementById('limit').value));
    webGLCont.uniform1f(shaderProgram.iSmoothValue, parseFloat(document.getElementById('valueOfSmooth').value));
    surface.Draw();
}


function CreateSurfaceData() {
    let points = new Array();
    let norms = new Array();

    let aMax = 360;
    let tMax = 20;
    let aStep = 15;
    let tStep = 0.5;
    let r = 1.4;
    let c = 1.4;
    let d = 1.4;
    let phi = 3.14 / 2;
    let alpha0 = 0;
    let pi = 3.14;
    let surfaceFormula = (a, t) => {
        let x = r*Math.cos(degreeToRad(a)) - (r*(degreeToRad(alpha0)-degreeToRad(a)) + t*Math.cos(phi) 
            - c*Math.sin(d*t)*Math.sin(phi))*Math.sin(degreeToRad(a));
        
        let y = r*Math.sin(degreeToRad(a)) + (r*(degreeToRad(alpha0)-degreeToRad(a)) + t*Math.cos(phi) 
            - c*Math.sin(d*t)*Math.sin(phi))*Math.cos(degreeToRad(a));
        
        let z = t*Math.sin(phi) + c*Math.sin(degreeToRad(d*t))*Math.cos(phi);
        return [x, y, z];
    }

    let normalAnalyticCalculation = (a, t) => {
        const eps = 0.001;
        let [u11, u12, u13] = surfaceFormula(a, t);
        let [v11, v12, v13] = [u11, u12, u13];
        let [u21, u22, u23] = surfaceFormula(a + eps, t);
        let [v21, v22, v23] = surfaceFormula(a, t + eps);
        let dU = new Array((u11 - u21) / eps, 
            (u12 - u22) / eps, 
            (u13 - u23) / eps
        ); 
        let dV = new Array((v11 - v21) / eps, 
            (v12 - v22) / eps, 
            (v13 - u23) / eps
        );
        
        return m4.normalize(m4.cross(dU, dV));
    }

    for (let a = 0; a <= aMax; a += aStep) {
        for (let t = 0; t <= tMax; t += tStep) {
            let a1 = [a, a + aStep, a, a, a + aStep, a + aStep];
            let t1 = [t, t, t + tStep, t + tStep, t, t + tStep];
            for (let i=0; i < a1.length;    i++) {
                points.push(...surfaceFormula(a1[i], t1[i]));
                norms.push(...normalAnalyticCalculation(a1[i], t1[i]));
            }
        }
    }

    return [points, norms];
}


function initGL() {
    let prog = createProgram(webGLCont, vertexSS, fragmentSS);

    shaderProgram = new ShaderProgram('Basic', prog);
    shaderProgram.Use();

    shaderProgram.iAttribVertex = webGLCont.getAttribLocation(prog, "vt");
    shaderProgram.iAttribNormal = webGLCont.getAttribLocation(prog, "nm");
    shaderProgram.iModelViewProjectionMatrix = webGLCont.getUniformLocation(prog, "MatrixOfViewProjection");
    shaderProgram.iNormalMatrix = webGLCont.getUniformLocation(prog, "MatrixOfNormals");

    shaderProgram.iColor = webGLCont.getUniformLocation(prog, "figureColor");
    shaderProgram.iLimit = webGLCont.getUniformLocation(prog, "limit");
    shaderProgram.iLightDirection = webGLCont.getUniformLocation(prog, "directionOfLight");
    shaderProgram.iLightPosition = webGLCont.getUniformLocation(prog, "positionOfLight");
    shaderProgram.iSmoothValue = webGLCont.getUniformLocation(prog, "smooth");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());

    webGLCont.enable(webGLCont.DEPTH_TEST);
}


function createProgram(webGLCont, vShader, fShader) {
    let vsh = webGLCont.createShader(webGLCont.VERTEX_SHADER);
    webGLCont.shaderSource(vsh, vShader);
    webGLCont.compileShader(vsh);
    if (!webGLCont.getShaderParameter(vsh, webGLCont.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + webGLCont.getShaderInfoLog(vsh));
    }
    let fsh = webGLCont.createShader(webGLCont.FRAGMENT_SHADER);
    webGLCont.shaderSource(fsh, fShader);
    webGLCont.compileShader(fsh);
    if (!webGLCont.getShaderParameter(fsh, webGLCont.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + webGLCont.getShaderInfoLog(fsh));
    }
    let prog = webGLCont.createProgram();
    webGLCont.attachShader(prog, vsh);
    webGLCont.attachShader(prog, fsh);
    webGLCont.linkProgram(prog);
    if (!webGLCont.getProgramParameter(prog, webGLCont.LINK_STATUS)) {
        throw new Error("Link error in program:  " + webGLCont.getProgramInfoLog(prog));
    }
    return prog;
}


function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        webGLCont = canvas.getContext("webgl");
        if (!webGLCont) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    simpleRotator = new TrackballRotator(canvas, draw, 0);

    window.requestAnimationFrame(function animationn() {
        draw();
        window.requestAnimationFrame(animationn);
    });
}
