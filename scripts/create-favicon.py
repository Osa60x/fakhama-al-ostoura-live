from PIL import Image, ImageDraw

size = 32
image = Image.new("RGBA", (size, size), (247, 242, 232, 255))
draw = ImageDraw.Draw(image)
draw.polygon([(16, 3), (27, 11), (16, 29), (5, 11)], fill=(230, 201, 109, 255), outline=(113, 83, 27, 255), width=2)
draw.line([(5, 11), (16, 16), (27, 11)], fill=(113, 83, 27, 255), width=2)
draw.line([(16, 16), (16, 29)], fill=(113, 83, 27, 255), width=2)
image.save("public/favicon.ico", sizes=[(16, 16), (32, 32)])
