attribute vec4 a_pos;

void main()
{
    gl_Position = a_pos;
    gl_PointSize = 500.0;
}
