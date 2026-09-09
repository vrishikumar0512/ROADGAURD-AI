"""
RoadGuard AI - Image Preprocessing and Security Validation
"""
import os
from PIL import Image
import numpy as np
import cv2

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def validate_image_file(file_path: str) -> tuple[bool, str]:
    """
    Validates that the file exists, has an allowed extension,
    does not exceed size limits, and is a genuine decodable image.
    """
    if not os.path.exists(file_path):
        return False, "File does not exist"

    size = os.path.getsize(file_path)
    if size == 0:
        return False, "File is empty"
    if size > MAX_FILE_SIZE_BYTES:
        return False, f"File size ({size / (1024*1024):.1f}MB) exceeds 25MB limit"

    _, ext = os.path.splitext(file_path)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    try:
        with Image.open(file_path) as img:
            img.verify()
        # Re-open after verify to ensure decode works
        with Image.open(file_path) as img:
            img.load()
            width, height = img.size
            if width < 32 or height < 32:
                return False, "Image dimensions are too small (minimum 32x32)"
    except Exception as e:
        return False, f"Corrupt or invalid image file: {str(e)}"

    return True, "Valid"


def load_and_preprocess_image(file_path: str, max_dim: int = 1280) -> tuple[np.ndarray, dict]:
    """
    Loads image safely via OpenCV, converts if needed, and downsizes
    if larger than max_dim while preserving aspect ratio.
    """
    # Read via PIL first to handle unicode paths cleanly on Windows
    pil_img = Image.open(file_path).convert("RGB")
    rgb_arr = np.array(pil_img)
    bgr_img = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)

    h, w = bgr_img.shape[:2]
    original_size = {"width": w, "height": h}

    if max(w, h) > max_dim:
        scale = max_dim / float(max(w, h))
        new_w = int(w * scale)
        new_h = int(h * scale)
        bgr_img = cv2.resize(bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    cur_h, cur_w = bgr_img.shape[:2]
    meta = {
        "original_width": original_size["width"],
        "original_height": original_size["height"],
        "processed_width": cur_w,
        "processed_height": cur_h,
        "channels": 3
    }
    return bgr_img, meta
