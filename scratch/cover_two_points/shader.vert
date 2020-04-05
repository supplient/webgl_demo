attribute vec4 a_pos;
attribute vec3 a_color;

varying vec3 v_color;

void main() {
    gl_Position = a_pos;
    gl_PointSize = 10.0;

    v_color = a_color;
}