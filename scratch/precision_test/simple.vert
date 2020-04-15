attribute vec4 a_pos;

varying vec4 v_pos;

void main()
{
    gl_Position = a_pos;
    gl_PointSize = 500.0;

    v_pos = a_pos;
}
