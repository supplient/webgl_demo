attribute vec4 a_pos;
attribute vec3 a_uv;

varying vec2 v_uv;

void main()
{
    gl_Position = a_pos;

    v_uv = a_uv.xy;
}
