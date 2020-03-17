/**
 * Delegate all the view events.
 * 
 * Include:
 * 
 *      Rotating: mouse draging or touch sliding
 * 
 *      Scaling: wheel up/down
 * @param canvas canvas object
 * @param onViewMatChange a function which canbe called as 'onViewMatChange(viewMat)', will be called when there is view events changing view mats which need updating view mats in GPU.
 * @return no return
 */
function registView(canvas, onViewMatChange) {
    // 1. Init view mats
    var view_rotate_mat = mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
    var view_scale_mat = mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );



    // 2. Set update function: only this function can access outside
    function updateViewMat() {
        var view_mat = mult(view_scale_mat, view_rotate_mat);
        onViewMatChange(view_mat);
    }
    updateViewMat();



    // 3. Set constants and vars
    // constants
    const DEGREE_PER_DIST = 0.2; // These for identifying mouse on the screen & realizing rotating
    const CENTER_VEC = vec4(0, 0, 1, 0);

    const INERTIA_DEGREE_FACTOR = 50; // These for realizing inertia rotating
    const INERTIA_FADE_FACTOR = 0.9375;
    const INERTIA_THETA = 0.1;
    const INERTIA_COUNT_POS_NUM = 4;
    const INERTIA_MAX_DETLA_TIME = 300;

    const WHEEL_FACTOR = -1/125/10; // These for realizing scale
    const PER_SCALE_FACTOR = 0.15;
    const MIN_SCALE_FACTOR = 0.1;

    // variables
    var old_view_mat = null; // These for identifying mouse on the screen & realizing rotating
    var start_pos = null;
    var is_dragging = false;

    var last_pos = []; // These for realizing inertia rotating
    var last_time = [];
    var inertia_axis = null;
    var inertia_degree = null;

    var scale_factor = 1; // These for realizing scale



    // 4. Set support functions
    function pushLastPosAndTime(now_pos) {
        last_pos.push(now_pos);
        last_time.push(new Date().getTime());
        if(last_pos.length > INERTIA_COUNT_POS_NUM) {
            last_pos = last_pos.slice(0, 1);
            last_time = last_time.slice(0, 1);
        }
    }

    function calDegreeAndAxis(now_pos, old_pos) {
        var delta_vec = subtract(now_pos, old_pos);
        delta_vec = vec4(delta_vec[0], -delta_vec[1], 0, 0);
        var dist = length(delta_vec);
        var degree = -dist * DEGREE_PER_DIST;
        var axis_vec = cross(CENTER_VEC, delta_vec);
        return [degree, axis_vec];
    }

    function inertiaRotateFrame() {
        if(!inertia_degree)
            return;
        var added_view_mat = rotate(inertia_degree, inertia_axis);
        view_rotate_mat = mult(added_view_mat, view_rotate_mat);
        updateViewMat();

        inertia_degree *= INERTIA_FADE_FACTOR;
        if(Math.abs(inertia_degree) < INERTIA_THETA) {
            inertia_axis = null;
            inertia_degree = null;
        }
        else
            requestAnimationFrame(inertiaRotateFrame);
    }



    // 5. Set view event listeners
    function onDown(now_pos) {
        // clear inertia
        inertia_axis = null;
        inertia_degree = null;
        last_pos = [];
        last_time = [];

        old_view_mat = view_rotate_mat;
        start_pos = now_pos;
        pushLastPosAndTime(start_pos);
        is_dragging = true;
    }

    function onMove(now_pos) {
        if(!is_dragging)
            return;
        pushLastPosAndTime(now_pos);

        var tmp = calDegreeAndAxis(now_pos, start_pos);
        var degree = tmp[0];
        var axis_vec = tmp[1];

        var added_view_mat = rotate(degree, axis_vec);
        view_rotate_mat = mult(added_view_mat, old_view_mat);
        updateViewMat();
    }

    function onUp(now_pos) {
        if(!is_dragging)
            return;
        is_dragging = false;

        pushLastPosAndTime(now_pos);

        // cal delta time
        var first_time = last_time[0];
        var end_time = last_time.pop();
        last_time = [];
        var delta_time = end_time - first_time;

        if(delta_time == 0 || delta_time > INERTIA_MAX_DETLA_TIME) {
            last_pos = [];
            return;
        }

        // cal delta degree and rotate axis
        var first_pos = last_pos[0];
        var end_pos = last_pos.pop();
        last_pos = [];
        var tmp = calDegreeAndAxis(end_pos, first_pos);
        var degree = tmp[0];
        inertia_axis = tmp[1];

        // cal inertia degree
        inertia_degree = degree / delta_time * INERTIA_DEGREE_FACTOR;

        requestAnimationFrame(inertiaRotateFrame);
    }

    function onCancel() {
        is_dragging = false;
    }

    function onScale(delta) {
        scale_factor += delta * PER_SCALE_FACTOR;
        if(scale_factor < MIN_SCALE_FACTOR)
            scale_factor = MIN_SCALE_FACTOR;

        view_scale_mat = scalem(scale_factor, scale_factor, scale_factor);
        updateViewMat();
    }



    // 6. Regist canvas event lisenter to connect view envents with canvas events
    canvas.addEventListener("mousedown", function(ev){
        onDown(vec2(ev.clientX, ev.clientY));
    });

    canvas.addEventListener("mousemove", function(ev){
        onMove(vec2(ev.clientX, ev.clientY));
    });

    canvas.addEventListener("mouseup", function(ev){
        onUp(vec2(ev.clientX, ev.clientY));
    });

    canvas.addEventListener("mouseleave", function(ev){
        onCancel();
    });

    canvas.addEventListener("wheel", function(ev){
        onScale(ev.deltaY * WHEEL_FACTOR);
    });

    canvas.addEventListener("touchstart", function(ev){
        if(ev.changedTouches.length < 1)
            return;
        var touch = ev.touches[0];
        onDown(vec2(touch.clientX, touch.clientY));
    });

    canvas.addEventListener("touchmove", function(ev){
        if(ev.changedTouches.length < 1)
            return;
        var touch = ev.touches[0];
        onMove(vec2(touch.clientX, touch.clientY));
    });

    canvas.addEventListener("touchend", function(ev){
        if(ev.changedTouches.length < 1)
            return;
        var touch = ev.touches[0];
        onUp(vec2(touch.clientX, touch.clientY));
    });

    canvas.addEventListener("touchcancel", function(ev){
        onCancel();
    });
}