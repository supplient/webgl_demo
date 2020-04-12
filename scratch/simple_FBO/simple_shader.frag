precision mediump float;

uniform sampler2D s_fbo;

varying vec2 v_uv;

void main()
{
    gl_FragColor = texture2D(s_fbo, v_uv);
}
