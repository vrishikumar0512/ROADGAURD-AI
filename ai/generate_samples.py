"""
Utility to generate realistic road damage sample images for RoadGuard AI.
Creates realistic asphalt road backgrounds with road defects:
- sample_pothole.jpg
- sample_longitudinal_crack.jpg
- sample_transverse_crack.jpg
- sample_alligator_crack.jpg
"""
import os
import cv2
import numpy as np

def create_asphalt_base(width=800, height=600):
    # Base asphalt gray
    base_color = np.full((height, width, 3), (60, 62, 65), dtype=np.uint8)
    
    # Asphalt noise and grain
    noise = np.random.normal(0, 18, (height, width, 3)).astype(np.int16)
    asphalt = np.clip(base_color.astype(np.int16) + noise, 35, 120).astype(np.uint8)
    
    # Add perspective road lane marking (dashed white or yellow)
    pts = np.array([[width * 0.48, height * 0.25], [width * 0.52, height * 0.25],
                    [width * 0.53, height * 0.45], [width * 0.47, height * 0.45]], np.int32)
    cv2.fillPoly(asphalt, [pts], (220, 220, 220))
    
    pts2 = np.array([[width * 0.46, height * 0.60], [width * 0.54, height * 0.60],
                     [width * 0.56, height * 0.95], [width * 0.44, height * 0.95]], np.int32)
    cv2.fillPoly(asphalt, [pts2], (220, 220, 220))
    
    # Slight gravel texture overlay
    gravel = np.random.choice([0, 25, -25], size=(height, width), p=[0.92, 0.04, 0.04]).astype(np.int16)
    for c in range(3):
        asphalt[:, :, c] = np.clip(asphalt[:, :, c].astype(np.int16) + gravel, 20, 220).astype(np.uint8)
        
    return asphalt

def generate_sample_pothole(out_path):
    img = create_asphalt_base()
    h, w = img.shape[:2]
    cx, cy = int(w * 0.58), int(h * 0.68)
    
    # Jagged dark hole contour
    pts = []
    num_pts = 36
    base_rx, base_ry = 95, 65
    for i in range(num_pts):
        angle = (2 * np.pi / num_pts) * i
        r_var = np.random.uniform(0.75, 1.25)
        px = int(cx + base_rx * r_var * np.cos(angle))
        py = int(cy + base_ry * r_var * np.sin(angle))
        pts.append([px, py])
    poly = np.array(pts, np.int32)
    
    # Draw crater shadow & dark cavity
    cv2.fillPoly(img, [poly], (25, 27, 30))
    
    # Inner deeper core
    inner_poly = np.array([[int(cx + (p[0] - cx) * 0.65), int(cy + (p[1] - cy) * 0.65)] for p in pts], np.int32)
    cv2.fillPoly(img, [inner_poly], (12, 14, 16))
    
    # Eroded gravel edge
    cv2.polylines(img, [poly], True, (110, 115, 120), 4)
    cv2.imwrite(out_path, img)

def generate_sample_longitudinal_crack(out_path):
    img = create_asphalt_base()
    h, w = img.shape[:2]
    
    # Crack going down the road
    x = int(w * 0.35)
    points = []
    for y in range(int(h * 0.30), int(h * 0.95), 12):
        x += np.random.randint(-6, 7)
        points.append([x, y])
        
    for i in range(len(points) - 1):
        cv2.line(img, tuple(points[i]), tuple(points[i+1]), (18, 20, 22), 5)
        # Jagged side branch
        if i % 6 == 0:
            branch_end = (points[i][0] + np.random.randint(-25, 25), points[i][1] + np.random.randint(10, 25))
            cv2.line(img, tuple(points[i]), branch_end, (25, 27, 30), 2)
            
    cv2.imwrite(out_path, img)

def generate_sample_transverse_crack(out_path):
    img = create_asphalt_base()
    h, w = img.shape[:2]
    
    # Crack cutting across lane
    y = int(h * 0.62)
    points = []
    for x in range(int(w * 0.15), int(w * 0.88), 15):
        y += np.random.randint(-5, 6)
        points.append([x, y])
        
    for i in range(len(points) - 1):
        cv2.line(img, tuple(points[i]), tuple(points[i+1]), (15, 18, 20), 6)
        # Erosion rim
        cv2.line(img, (points[i][0], points[i][1] + 2), (points[i+1][0], points[i+1][1] + 2), (95, 100, 105), 1)
        
    cv2.imwrite(out_path, img)

def generate_sample_alligator_crack(out_path):
    img = create_asphalt_base()
    h, w = img.shape[:2]
    
    # Mesh / spiderweb pattern of cracks
    start_x, start_y = int(w * 0.30), int(h * 0.45)
    end_x, end_y = int(w * 0.75), int(h * 0.85)
    
    # Grid with perturbations
    cell_w, cell_h = 35, 30
    grid_pts = {}
    for r, gy in enumerate(range(start_y, end_y, cell_h)):
        for c, gx in enumerate(range(start_x, end_x, cell_w)):
            jitter_x = gx + np.random.randint(-10, 10)
            jitter_y = gy + np.random.randint(-8, 8)
            grid_pts[(r, c)] = (jitter_x, jitter_y)
            
    for (r, c), pt in grid_pts.items():
        if (r, c + 1) in grid_pts:
            cv2.line(img, pt, grid_pts[(r, c + 1)], (20, 22, 25), 3)
        if (r + 1, c) in grid_pts:
            cv2.line(img, pt, grid_pts[(r + 1, c)], (20, 22, 25), 3)
        if (r + 1, c + 1) in grid_pts and np.random.random() > 0.4:
            cv2.line(img, pt, grid_pts[(r + 1, c + 1)], (24, 26, 30), 2)
            
    cv2.imwrite(out_path, img)

def generate_all_samples(target_dir):
    os.makedirs(target_dir, exist_ok=True)
    generate_sample_pothole(os.path.join(target_dir, "sample_pothole.jpg"))
    generate_sample_longitudinal_crack(os.path.join(target_dir, "sample_longitudinal_crack.jpg"))
    generate_sample_transverse_crack(os.path.join(target_dir, "sample_transverse_crack.jpg"))
    generate_sample_alligator_crack(os.path.join(target_dir, "sample_alligator_crack.jpg"))
    print(f"[RoadGuard AI] Generated 4 realistic sample images in {target_dir}")

if __name__ == "__main__":
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    samples_dir = os.path.abspath(os.path.join(curr_dir, "..", "uploads", "samples"))
    generate_all_samples(samples_dir)
