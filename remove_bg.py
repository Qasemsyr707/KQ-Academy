from PIL import Image

def remove_black_background(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # item is (R, G, B, A)
            # If the pixel is very dark (close to black)
            if item[0] < 30 and item[1] < 30 and item[2] < 30:
                # Replace with transparent
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(img_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

remove_black_background("public/logo.png")
