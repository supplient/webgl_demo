凹凸纹理中存的是高度数值，法线纹理里面存的才是法线数值。


注意存储纹理时gl内部会使用内存对齐，可以使用pixelStorei来修改字节对齐的数值。详见：
* https://stackoverflow.com/questions/11042027/glpixelstoreigl-unpack-alignment-1-disadvantages
* https://www.khronos.org/opengl/wiki/Pixel_Transfer#Pixel_layout
* https://blog.csdn.net/csxiaoshui/article/details/53032442
因此而可能有的问题就是由凹凸纹理计算法线纹理时可能会因为修改了纹理大小而导致不再对齐，而报错：
* https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance