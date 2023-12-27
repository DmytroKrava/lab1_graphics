'use strict';

let webGLCont;
let surface, line, sphere;
let shaderProgram;
let simpleRotator;
let txTr = [1, 1]

document.onkeydown = function(event) {
    if (event.keyCode == 87) {
        txTr[0] = Math.min(txTr[0] + 0.01, 1);
    }
    else if (event.keyCode == 65) {
        txTr[1] = Math.max(txTr[1] - 0.01, 0);
    }
    else if (event.keyCode == 83) {
        txTr[0] = Math.max(txTr[0] - 0.01, 0);
    }
    else if (event.keyCode == 68) {
        txTr[1] = Math.min(txTr[1] + 0.01, 1);
    }
}

function degreeToRad(angle) {
    return angle * Math.PI / 180;
}


function Model(name) {
    this.name = name;
    this.iVertexBuffer = webGLCont.createBuffer();
    this.iVertexBufferOfNormal = webGLCont.createBuffer();
    this.iVertexBufferOfTexCoord = webGLCont.createBuffer();

    this.BufferData = function (vertices, normals, texCoords) {
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBuffer);
        webGLCont.bufferData(webGLCont.ARRAY_BUFFER, new Float32Array(vertices), webGLCont.STREAM_DRAW);
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBufferOfNormal);
        webGLCont.bufferData(webGLCont.ARRAY_BUFFER, new Float32Array(normals), webGLCont.STREAM_DRAW);
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBufferOfTexCoord);
        webGLCont.bufferData(webGLCont.ARRAY_BUFFER, new Float32Array(texCoords), webGLCont.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    this.Draw = function () {
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBuffer);
        webGLCont.vertexAttribPointer(shaderProgram.iAttribVertex, 3, webGLCont.FLOAT, false, 0, 0);
        webGLCont.enableVertexAttribArray(shaderProgram.iAttribVertex);
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBufferOfNormal);
        webGLCont.vertexAttribPointer(shaderProgram.iAttribNormal, 3, webGLCont.FLOAT, false, 0, 0);
        webGLCont.enableVertexAttribArray(shaderProgram.iAttribNormal);
        webGLCont.bindBuffer(webGLCont.ARRAY_BUFFER, this.iVertexBufferOfTexCoord);
        webGLCont.vertexAttribPointer(shaderProgram.iAttribTexCoord, 2, webGLCont.FLOAT, false, 0, 0);
        webGLCont.enableVertexAttribArray(shaderProgram.iAttribTexCoord);
        webGLCont.drawArrays(webGLCont.TRIANGLES, 0, this.count)
    }
}


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        webGLCont.useProgram(this.prog);
    }
}


function draw() {
    webGLCont.clearColor(0, 0, 0, 1);
    webGLCont.clear(webGLCont.COLOR_BUFFER_BIT | webGLCont.DEPTH_BUFFER_BIT);

    const projectionTransformation = 40;
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

    webGLCont.uniform1f(shaderProgram.iLimit, 0);
    webGLCont.uniform1f(shaderProgram.iSmoothValue, 0);
    webGLCont.uniform1f(shaderProgram.iAngle, parseFloat(document.getElementById('angle').value));
    webGLCont.uniform2fv(shaderProgram.iTxTr, txTr);
    
    surface.Draw();
    webGLCont.uniform1f(shaderProgram.iSmoothValue, -1000);
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
        let x = r * Math.cos(degreeToRad(a)) - (r * (degreeToRad(alpha0) - degreeToRad(a)) + t * Math.cos(phi)
            - c * Math.sin(d * t) * Math.sin(phi)) * Math.sin(degreeToRad(a));

        let y = r * Math.sin(degreeToRad(a)) + (r * (degreeToRad(alpha0) - degreeToRad(a)) + t * Math.cos(phi)
            - c * Math.sin(d * t) * Math.sin(phi)) * Math.cos(degreeToRad(a));

        let z = t * Math.sin(phi) + c * Math.sin(degreeToRad(d * t)) * Math.cos(phi);
        return [x, y, z];
    }
    webGLCont.uniformMatrix4fv(shaderProgram.iModelViewProjectionMatrix, false, m4.multiply(modelViewProjection, m4.translation(
        ...surfaceFormula(txTr[0] * aMax, txTr[1] * tMax))));
    sphere.Draw()
}


function CreateSurfaceData() {
    let points = new Array();
    let norms = new Array();
    let texCos = new Array();

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
        let x = r * Math.cos(degreeToRad(a)) - (r * (degreeToRad(alpha0) - degreeToRad(a)) + t * Math.cos(phi)
            - c * Math.sin(d * t) * Math.sin(phi)) * Math.sin(degreeToRad(a));

        let y = r * Math.sin(degreeToRad(a)) + (r * (degreeToRad(alpha0) - degreeToRad(a)) + t * Math.cos(phi)
            - c * Math.sin(d * t) * Math.sin(phi)) * Math.cos(degreeToRad(a));

        let z = t * Math.sin(phi) + c * Math.sin(degreeToRad(d * t)) * Math.cos(phi);
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
            for (let i = 0; i < a1.length; i++) {
                points.push(...surfaceFormula(a1[i], t1[i]));
                norms.push(...normalAnalyticCalculation(a1[i], t1[i]));
                texCos.push(a1[i] / aMax, t1[i] / tMax)
            }
        }
    }

    return [points, norms, texCos];
}


function map(value, a, b, c, d) {
    value = (value - a) / (b - a);
    return c + value * (d - c);
}


function initGL() {
    let prog = createProgram(webGLCont, vertexSS, fragmentSS);

    shaderProgram = new ShaderProgram('Basic', prog);
    shaderProgram.Use();

    shaderProgram.iAttribVertex = webGLCont.getAttribLocation(prog, "vt");
    shaderProgram.iAttribNormal = webGLCont.getAttribLocation(prog, "nm");
    shaderProgram.iAttribTexCoord = webGLCont.getAttribLocation(prog, "tx");
    shaderProgram.iModelViewProjectionMatrix = webGLCont.getUniformLocation(prog, "MatrixOfViewProjection");
    shaderProgram.iNormalMatrix = webGLCont.getUniformLocation(prog, "MatrixOfNormals");

    shaderProgram.iColor = webGLCont.getUniformLocation(prog, "figureColor");
    shaderProgram.iLimit = webGLCont.getUniformLocation(prog, "limit");
    shaderProgram.iLightDirection = webGLCont.getUniformLocation(prog, "directionOfLight");
    shaderProgram.iLightPosition = webGLCont.getUniformLocation(prog, "positionOfLight");
    shaderProgram.iSmoothValue = webGLCont.getUniformLocation(prog, "smooth");
    shaderProgram.iAngle = webGLCont.getUniformLocation(prog, "angle");
    shaderProgram.iTxTr = webGLCont.getUniformLocation(prog, "txTr");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());
    line = new Model();
    sphere = new Model();
    line.BufferData([0, 0, 0, 2, 2, 2], [0, 0, 0, 1, 1, 1]);

    sphere.BufferData(...sphereData());
    webGLCont.enable(webGLCont.DEPTH_TEST);
}


function sphereData() {
    let vertexList = new Array();
    let normalList = new Array();
    for (let u = 0; u < Math.PI * 2;    u += 0.1) {
        for (let t = 0; t < Math.PI;    t += 0.1) {
            let v = sphereVertex(u, t);
            let w = sphereVertex(u + 0.1, t);
            let wv = sphereVertex(u, t + 0.1);
            let ww = sphereVertex(u + 0.1, t + 0.1);
            vertexList.push(v.x, v.y, v.z);
            normalList.push(v.x, v.y, v.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(ww.x, ww.y, ww.z);
            normalList.push(ww.x, ww.y, ww.z);
        }
    }
    return [vertexList, normalList, vertexList];
}

function sphereVertex(long, lat) {
    const r = 1;
    let px = r * Math.cos(long) * Math.sin(lat);
    let py = r * Math.sin(long) * Math.sin(lat);
    let pz = r * Math.cos(lat);
    return {x: px, y: py, z: pz}
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

        let textureOfFigure = webGLCont.createTexture();
        webGLCont.bindTexture(webGLCont.TEXTURE_2D, textureOfFigure);
        webGLCont.texParameteri(webGLCont.TEXTURE_2D, webGLCont.TEXTURE_MIN_FILTER, webGLCont.LINEAR);
        let img = new Image();
        img.src = "https://raw.githubusercontent.com/DmytroKrava/graphicLabs/main/water.jpg";
        img.crossOrigin = 'anonymus';
        img.onload = function() {
            webGLCont.bindTexture(webGLCont.TEXTURE_2D, textureOfFigure);
            webGLCont.texImage2D(webGLCont.TEXTURE_2D, 0, webGLCont.RGBA, webGLCont.RGBA, webGLCont.UNSIGNED_BYTE, img);
            draw()
        }
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
