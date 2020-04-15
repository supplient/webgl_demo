precision mediump float;

uniform sampler2D s_fbo;

varying vec4 v_pos;

void main()
{
    vec2 uv = v_pos.xy / 2.0 + 0.5;
    vec4 color = texture2D(s_fbo, uv);
    gl_FragColor = vec4(color.xyz*100.0, 1.0);
}
