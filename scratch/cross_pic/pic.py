from PIL import Image
import numpy as np

def createData(a_pixel, b_pixel):
    N = 300
    data = []
    row_flag = True
    for i in range(N):
        row_data = []
        col_flag = row_flag
        for j in range(N):
            pixel_data = None
            if col_flag:
                pixel_data = a_pixel
            else:
                pixel_data = b_pixel
            row_data.append(pixel_data)
            col_flag = not col_flag
        data.append(row_data)
        row_flag = not row_flag
    return data

def saveImage(a_pixel, b_pixel, filename):
    data = createData(a_pixel, b_pixel)
    a = np.asarray(data, dtype="uint8")
    im = Image.fromarray(a, mode="RGB")
    im.save(filename, format="bmp")

saveImage([255, 0, 0], [0, 255, 0], "green_red.bmp")

color = 135
saveImage([color, color, 0], [color, color, 0], "yellow.bmp")