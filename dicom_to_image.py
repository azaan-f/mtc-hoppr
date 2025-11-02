import argparse
import pydicom
import numpy as np
from PIL import Image
import sys
import os

def dicom_to_png(dicom_path: str, output_path: str = None) -> str:
    """
    Convert DICOM file to PNG image for display.
    
    Args:
        dicom_path: Path to the DICOM file
        output_path: Optional path for output PNG file
        
    Returns:
        Path to the created PNG file
    """
    if not os.path.exists(dicom_path):
        raise FileNotFoundError(f"DICOM file not found: {dicom_path}")
    
    ds = pydicom.dcmread(dicom_path)
    
    pixel_array = ds.pixel_array
    
    if pixel_array.dtype != np.uint8:
        if pixel_array.max() > 255:
            pixel_array = ((pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
        else:
            pixel_array = pixel_array.astype(np.uint8)
    
    if len(pixel_array.shape) == 2:
        image = Image.fromarray(pixel_array, mode='L')
    elif len(pixel_array.shape) == 3:
        image = Image.fromarray(pixel_array)
    else:
        raise ValueError(f"Unsupported pixel array shape: {pixel_array.shape}")
    
    if output_path is None:
        output_path = dicom_path.replace('.dcm', '.png').replace('.DCM', '.png')
    
    image.save(output_path, 'PNG')
    
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert DICOM file to PNG image")
    parser.add_argument("input_path", type=str, help="Path to input DICOM file")
    parser.add_argument("--output", type=str, help="Path to output PNG file (optional)")
    args = parser.parse_args()
    
    try:
        output_path = dicom_to_png(args.input_path, args.output)
        print(output_path)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        exit(1)
