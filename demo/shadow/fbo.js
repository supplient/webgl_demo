import {PointLight} from "./light.js"

export function init2DShadowFBO(gl, width, height) {
    var fbo = gl.createFramebuffer();

    var fbo_tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, fbo_tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    var fbo_depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, fbo_depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbo_tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fbo_depth);

    var fbo_check = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(fbo_check != gl.FRAMEBUFFER_COMPLETE)
        throw fbo_check.toString();

    return {
        height: height,
        width: width,
        fbo: fbo,
        fbo_tex: fbo_tex,
        fbo_depth: fbo_depth,
    }
}

export function initPointShadowFBO(gl, per_width, per_height) {
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    var fbo_tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, fbo_tex);
    for (const target of PointLight.getTargets(gl)) {
        gl.texImage2D(target, 0, gl.RGBA, per_width, per_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, fbo_tex, 0);
        // TODO is it necessary to framebufferTexture2D here?
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    var fbo_depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, fbo_depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, per_width, per_height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fbo_depth);

    var fbo_check = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(fbo_check != gl.FRAMEBUFFER_COMPLETE)
        throw fbo_check.toString();

    return {
        per_height: per_height,
        per_width: per_width,
        fbo: fbo,
        fbo_tex: fbo_tex,
        fbo_depth: fbo_depth,
    }
}