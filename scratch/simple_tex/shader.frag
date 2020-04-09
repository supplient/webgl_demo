precision mediump float;

uniform sampler2D s_diffuse;
varying vec2 v_uv;

void main()
{
    gl_FragColor = texture2D(s_diffuse, v_uv);
    // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
